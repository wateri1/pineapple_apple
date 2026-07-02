# -*- coding: utf-8 -*-
"""
Удаление фона с изображений (оффлайн) с превью «до / после» и ползунком.

Возможности:
  - прикрепить фото (jpg, png, webp, bmp ...);
  - удалить фон локально (нейросеть U2-Net через rembg, работает без интернета
    после первой загрузки модели ~170 МБ);
  - превью со слайдером: тянешь ползунок — слева исходник, справа результат
    (прозрачность показана шахматным фоном);
  - сохранить результат как PNG с прозрачностью.

Зависимости: rembg, onnxruntime, pillow  (Tkinter входит в стандартную поставку).
"""

import os
import threading
import tkinter as tk
from tkinter import filedialog, messagebox

from PIL import Image, ImageTk

# rembg импортируем лениво (тяжёлый), но сессию создаём один раз
from rembg import remove, new_session


# ------------------------------------------------------------------ цвета / тема
BG = "#0b0d1a"          # глубокий космос
PANEL = "#141830"
ACCENT = "#6c8cff"
ACCENT_HOVER = "#8aa4ff"
TEXT = "#e6e9ff"
MUTED = "#8b90b5"

MAX_W, MAX_H = 820, 540  # максимальный размер области превью


def make_checkerboard(size, square=12):
    """Шахматный фон для отображения прозрачности."""
    w, h = size
    img = Image.new("RGB", (w, h), (235, 235, 235))
    dark = (200, 200, 200)
    px = img.load()
    for y in range(h):
        for x in range(w):
            if (x // square + y // square) % 2 == 0:
                px[x, y] = dark
    return img


class App:
    def __init__(self, root):
        self.root = root
        root.title("✦ Удаление фона — Space Machine")
        root.configure(bg=BG)
        root.minsize(700, 560)

        self.session = None          # сессия rembg (создаётся один раз)
        self.original = None         # PIL.Image исходник (RGBA)
        self.result = None           # PIL.Image результат (RGBA, фон удалён)

        # данные для слайдера превью
        self._before_disp = None     # RGB, масштабированный исходник
        self._after_disp = None      # RGB, результат поверх шахматки
        self._disp_size = (0, 0)
        self._tk_img = None          # ссылка, чтобы не съел GC
        self._divider = 0.5          # положение ползунка 0..1

        self._build_ui()

    # --------------------------------------------------------------- интерфейс
    def _build_ui(self):
        # верхняя панель кнопок
        top = tk.Frame(self.root, bg=BG)
        top.pack(fill="x", padx=16, pady=(16, 8))

        self.btn_open = self._button(top, "📂  Прикрепить фото", self.open_image)
        self.btn_open.pack(side="left")

        self.btn_process = self._button(top, "✨  Удалить фон", self.process_image,
                                        primary=True)
        self.btn_process.pack(side="left", padx=8)
        self.btn_process.configure(state="disabled")

        self.btn_save = self._button(top, "💾  Сохранить PNG", self.save_image)
        self.btn_save.pack(side="left")
        self.btn_save.configure(state="disabled")

        # область превью
        self.canvas = tk.Canvas(self.root, bg=PANEL, highlightthickness=0,
                                width=MAX_W, height=MAX_H)
        self.canvas.pack(padx=16, pady=8)
        self.canvas.bind("<Button-1>", self._on_drag)
        self.canvas.bind("<B1-Motion>", self._on_drag)
        self._show_placeholder()

        # статус
        self.status = tk.Label(self.root, text="Прикрепите фото, чтобы начать.",
                               bg=BG, fg=MUTED, anchor="w",
                               font=("Segoe UI", 10))
        self.status.pack(fill="x", padx=18, pady=(2, 14))

    def _button(self, parent, text, cmd, primary=False):
        bg = ACCENT if primary else PANEL
        fg = "#0b0d1a" if primary else TEXT
        b = tk.Button(parent, text=text, command=cmd, bd=0, relief="flat",
                      bg=bg, fg=fg, activebackground=ACCENT_HOVER,
                      activeforeground="#0b0d1a", cursor="hand2",
                      font=("Segoe UI Semibold", 11), padx=16, pady=10)
        return b

    def _show_placeholder(self):
        self.canvas.delete("all")
        self.canvas.create_text(MAX_W // 2, MAX_H // 2,
                                text="✦  Здесь появится превью  ✦",
                                fill=MUTED, font=("Segoe UI", 14))

    def _set_status(self, text, color=MUTED):
        self.status.configure(text=text, fg=color)
        self.root.update_idletasks()

    # ------------------------------------------------------------- открыть файл
    def open_image(self):
        path = filedialog.askopenfilename(
            title="Выберите изображение",
            filetypes=[("Изображения", "*.png *.jpg *.jpeg *.webp *.bmp *.tiff"),
                       ("Все файлы", "*.*")])
        if not path:
            return
        try:
            self.original = Image.open(path).convert("RGBA")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось открыть файл:\n{e}")
            return

        self.result = None
        self.btn_process.configure(state="normal")
        self.btn_save.configure(state="disabled")
        self._prepare_display(after=None)
        self._render()
        self._set_status(f"Загружено: {os.path.basename(path)}  "
                         f"({self.original.width}×{self.original.height}). "
                         f"Нажмите «Удалить фон».", TEXT)

    # ------------------------------------------------------------- удалить фон
    def process_image(self):
        if self.original is None:
            return
        self.btn_process.configure(state="disabled")
        self.btn_open.configure(state="disabled")
        self._set_status("Удаление фона… Первый запуск скачивает модель "
                         "(~170 МБ), это разово.", ACCENT_HOVER)

        # тяжёлую работу — в отдельный поток, чтобы окно не зависало
        threading.Thread(target=self._process_worker, daemon=True).start()

    def _process_worker(self):
        try:
            if self.session is None:
                self.session = new_session("u2net")
            out = remove(self.original, session=self.session)
            out = out.convert("RGBA")
            self.root.after(0, self._process_done, out, None)
        except Exception as e:
            self.root.after(0, self._process_done, None, e)

    def _process_done(self, out, error):
        self.btn_open.configure(state="normal")
        self.btn_process.configure(state="normal")
        if error is not None:
            self._set_status("Ошибка при обработке.", "#ff6b6b")
            messagebox.showerror("Ошибка", f"Не удалось удалить фон:\n{error}")
            return
        self.result = out
        self.btn_save.configure(state="normal")
        self._prepare_display(after=out)
        self._divider = 0.5
        self._render()
        self._set_status("Готово! Тяните ползунок для сравнения «до/после», "
                         "затем сохраните PNG.", "#7CFC9A")

    # ------------------------------------------------------------- сохранить
    def save_image(self):
        if self.result is None:
            return
        path = filedialog.asksaveasfilename(
            title="Сохранить как PNG", defaultextension=".png",
            filetypes=[("PNG с прозрачностью", "*.png")])
        if not path:
            return
        try:
            self.result.save(path, "PNG")
            self._set_status(f"Сохранено: {path}", "#7CFC9A")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось сохранить:\n{e}")

    # --------------------------------------------------- подготовка превью
    def _prepare_display(self, after):
        """Масштабирует исходник (и результат) под область превью."""
        scale = min(MAX_W / self.original.width, MAX_H / self.original.height, 1.0)
        dw = max(1, int(self.original.width * scale))
        dh = max(1, int(self.original.height * scale))
        self._disp_size = (dw, dh)

        before = self.original.convert("RGBA").resize((dw, dh), Image.LANCZOS)
        self._before_disp = before.convert("RGB")

        if after is not None:
            board = make_checkerboard((dw, dh))
            a = after.resize((dw, dh), Image.LANCZOS)
            board.paste(a, (0, 0), a)        # композит по альфа-каналу
            self._after_disp = board
        else:
            self._after_disp = None

        self.canvas.configure(width=dw, height=dh)

    def _render(self):
        """Собирает картинку со слайдером и рисует на canvas."""
        if self._before_disp is None:
            return
        dw, dh = self._disp_size

        if self._after_disp is None:
            combined = self._before_disp.copy()
            split = dw
        else:
            split = int(self._divider * dw)
            split = max(0, min(dw, split))
            combined = self._after_disp.copy()
            # левую часть берём из исходника
            if split > 0:
                left = self._before_disp.crop((0, 0, split, dh))
                combined.paste(left, (0, 0))

        self._tk_img = ImageTk.PhotoImage(combined)
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor="nw", image=self._tk_img)

        if self._after_disp is not None:
            # вертикальная линия-разделитель + ручка
            self.canvas.create_line(split, 0, split, dh, fill="white", width=2)
            r = 16
            cy = dh // 2
            self.canvas.create_oval(split - r, cy - r, split + r, cy + r,
                                    fill=ACCENT, outline="white", width=2)
            self.canvas.create_text(split, cy, text="⇄", fill="white",
                                    font=("Segoe UI", 12, "bold"))
            # подписи «ДО / ПОСЛЕ»
            self.canvas.create_text(8, 14, anchor="nw", text="ДО",
                                    fill="white", font=("Segoe UI Semibold", 11))
            self.canvas.create_text(dw - 8, 14, anchor="ne", text="ПОСЛЕ",
                                    fill="white", font=("Segoe UI Semibold", 11))

    def _on_drag(self, event):
        if self._after_disp is None:
            return
        dw = self._disp_size[0]
        self._divider = max(0.0, min(1.0, event.x / dw))
        self._render()


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
