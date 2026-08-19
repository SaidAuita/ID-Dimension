# ID Dimension

![ID Dimension Interface](images/ID_Dimension_cover.png) 
*(Note: Please add a cover image named `ID_Dimension_cover.png` to the `images` folder)*

*( 🇬🇧 [English](#english) | 🇷🇺 [Русский](#русский) )*

---

<a id="english"></a>
## 🇬🇧 English

**ID Dimension** is a powerful tool for Adobe InDesign designed to automatically draw technical dimensions, bounds, and leader lines for page items and vector objects.

This repository includes **two versions** of the tool in one package:
1. **Modern CEP Extension** — A native, dockable panel with a sleek HTML/JS interface (CC 2014+).
2. **Standalone Script (ScriptUI)** — A classic `.jsx` script that opens as a floating palette. It is easier to install, requires no registry tweaks, and is highly compatible with older InDesign versions.

### Main Features and Capabilities
* **Two UI options** — Choose between a modern dockable panel or a lightweight floating ScriptUI palette.
* **Measurement units** — Choose between mm, cm, in, pt, and px. The math automatically adapts to your workflow, and the selected unit can be displayed next to the number (the `unit` option).
* **Color presets (CMYK)** — Set custom colors for dimension lines and text. Includes 6 customizable color swatch slots.
* **Settings preservation** — Automatically remembers your settings across InDesign sessions (stored locally).
* **3 preset slots (min / med / max)** — Quick switching between prepared dimension styles. Overwrite them by enabling `save` mode.
* **Reset to factory defaults (default)** — Reset all options and swatches back to initial defaults at any time.

### Dimensioning Tools
* Dimensioning width (top / bottom) and height (left / right).
* Dimensioning the gap between two selected objects (with `Ctrl` / `Cmd` key held).
* Measuring the radius and diameter of circles and circular frames.
* Marking the center of an object.
* Customizable appearance: stroke weight, gap, indent, arrow size, font size, and precision (up to 3 decimal places).
* Moving all dimensions to a designated separate layer (`layer` option).
* Option to place dimensions outside the active page/spread boundary (`out page` / `out artboard` option).

### Installation

You can install either the modern Extension or the Standalone Script (or both).

#### Option A: Modern CEP Extension (Dockable Panel)
Supports Adobe InDesign CC 2014 – 2026+.
1. **Enable Debug Mode:** Run the `enable_player_debug_mode.reg` file by double-clicking it. Confirm adding the changes to the registry.
2. **Copy Files:** Copy the entire `ID Dimension` folder into:
   `%APPDATA%\Adobe\CEP\extensions\`
   *(Press `Win + R`, paste the path, and press Enter to quickly open the folder).*
3. **Launch:** Restart Adobe InDesign. In the top menu, open:
   `Window -> Extensions -> ID Dimension` (or `Extensions (Legacy) -> ID Dimension`).

> [!WARNING]
> Install the CEP plugin specifically in the `%APPDATA%` path. If installed globally (in Program Files), the automatic saving of settings and colors may not work due to lack of write permissions!

#### Option B: Standalone Script (Floating Palette)
1. Copy only the `ID Dimension.jsx` file.
2. Paste it into your InDesign Scripts Panel folder. Usually located at:
   `%APPDATA%\Adobe\InDesign\Version <XX.X>\<Locale>\Scripts\Scripts Panel\`
   *(You can easily find this folder from InDesign: open `Window -> Utilities -> Scripts`, right-click on the "User" folder and select "Reveal in Explorer").*
3. **Launch:** In the Scripts panel, double-click `ID Dimension.jsx` to open the palette.

## 🛠️ Other Projects

**[AI Dimension](https://github.com/SaidAuita/AI-Dimension)**
* A similar extension designed specifically for Adobe Illustrator.

**[ComfyUI Photoshop Plugin (PH-CU-S)](https://github.com/SaidAuita/ComfyUI_PH-CU-S)**
* A powerful Photoshop plugin powered by ComfyUI, providing direct integration with local generative models.

---

<a id="русский"></a>
## 🇷🇺 Русский

**ID Dimension** — это мощный инструмент для Adobe InDesign, предназначенный для автоматического проставления технических размеров, габаритов и выносных линий к объектам и фреймам.

В этом репозитории представлены сразу **две версии** инструмента:
1. **Современное CEP-расширение** — нативная закрепляемая панель с современным HTML/JS интерфейсом (для версий CC 2014+).
2. **Отдельный скрипт (ScriptUI)** — классический скрипт (`.jsx`), который открывается в виде плавающей палитры. Он проще в установке, не требует правок реестра и отлично работает в более старых версиях InDesign.

### Основные возможности
* **Два варианта интерфейса** — выбирайте между современной закрепляемой панелью и легкой плавающей палитрой ScriptUI.
* **Единицы измерения** — поддержка выбора размерностей (mm, cm, in, pt, px). Математика скрипта автоматически адаптируется под ваш документ, а выбранную единицу измерения можно выводить рядом с числом (опция `unit`).
* **Цветовые пресеты (CMYK)** — настройка цвета выносных линий и текста. Есть 6 ячеек для сохранения собственных цветов.
* **Сохранение настроек** — панель автоматически запоминает все параметры между сессиями работы в InDesign.
* **3 слота для пресетов (min / med / max)** — быстрое переключение между заготовленными стилями размеров. Для перезаписи включите галочку `save` и нажмите на нужный пресет.
* **Сброс до заводских настроек (default)** — возврат всех значений и цветов к состоянию по умолчанию.

### Функционал
* Простановка ширины (сверху / снизу) и высоты (слева / справа).
* Простановка размеров между двумя выбранными объектами (с зажатой клавишей `Ctrl` / `Cmd`).
* Измерение радиуса и диаметра окружностей.
* Пометка центра объекта.
* Гибкая настройка: толщина линии (stroke), отступ от объекта (gap), вынос линии (indent), размер стрелки (arrow), размер шрифта и точность округления (до 3 знаков).
* Вынос всех размеров на отдельный слой (опция `layer`).
* Возможность выносить размеры за пределы страницы / разворота (опция `out page`).

### Установка

Вы можете установить либо современное расширение, либо отдельный скрипт (или оба варианта сразу).

#### Вариант А: Современное CEP-расширение (Закрепляемая панель)
Поддерживает версии Adobe InDesign CC 2014 – 2026+.
1. **Включение режима отладки:** Запустите файл `enable_player_debug_mode.reg` двойным кликом и подтвердите добавление изменений в реестр.
2. **Копирование файлов:** Скопируйте всю папку `ID Dimension` в:
   `%APPDATA%\Adobe\CEP\extensions\`
   *(Нажмите `Win + R`, вставьте путь и нажмите Enter, чтобы быстро открыть папку).*
3. **Запуск:** Перезапустите Adobe InDesign. В верхнем меню откройте: 
   `Окно -> Расширения -> ID Dimension` (или `Расширения (устаревшие) -> ID Dimension`).

> [!WARNING]
> Устанавливайте CEP-плагин именно по пути `%APPDATA%`. Если установить его глобально (в Program Files), функция автоматического сохранения настроек и цветов может не работать из-за отсутствия прав на запись!

#### Вариант Б: Отдельный скрипт (Плавающая палитра)
1. Скопируйте только файл `ID Dimension.jsx`.
2. Поместите его в папку со скриптами InDesign. Обычно она находится по пути:
   `%APPDATA%\Adobe\InDesign\Version <XX.X>\<Locale>\Scripts\Scripts Panel\`
   *(Эту папку легко найти из самого InDesign: откройте `Окно -> Утилиты -> Сценарии` (Window -> Utilities -> Scripts), кликните правой кнопкой мыши по папке "Пользователь" (User) и выберите "Показать в Проводнике").*
3. **Запуск:** В панели скриптов InDesign дважды кликните по `ID Dimension.jsx`, чтобы открыть палитру.

## 🛠️ Мои проекты

**[AI Dimension](https://github.com/SaidAuita/AI-Dimension)**
* Аналогичное расширение, разработанное специально для Adobe Illustrator.

**[ComfyUI Photoshop Plugin (PH-CU-S)](https://github.com/SaidAuita/ComfyUI_PH-CU-S)**
* Мощный плагин для Photoshop на базе ComfyUI, обеспечивающий прямую интеграцию с локальными генеративными моделями.
