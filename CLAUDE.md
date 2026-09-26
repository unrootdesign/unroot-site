# unroot.design

Сайт агентства Unroot Design. Astro, статика, деплой на Cloudflare Pages.
Переезд с Webflow. Дизайн новый, контент старый.

## Железные правила

1. **URL не меняются. Никогда.**
   Список живых URL заморожен в `scripts/live-urls.json`. Это то, что уже
   проиндексировано Google. Любая пропажа URL это потеря трафика.
   После любой правки: `npm run build && npm run urls`. Красное значит стоп.

2. **`title` и `description` переносятся из Webflow дословно.**
   Не переписывать, не улучшать, не сокращать. Они уже ранжируются.
   Если очень хочется переписать, это отдельная задача после переезда,
   когда позиции устаканятся.

3. **Дизайн живёт в `src/styles/tokens.css`.**
   Цвета, шрифты, размеры, отступы, радиусы только оттуда. В компонентах
   пишем `var(--c-accent)`, а не `#16161a`. Так новая главная перекрашивает
   все 23 страницы разом.

4. **Никаких длинных тире.** Ни в копирайте, ни в комментариях, ни в UI.
   Запятая, двоеточие или новое предложение.

5. **"website", не "site".** Везде в текстах на сайте.

## Структура

```
src/
  styles/tokens.css      единственное место для дизайн-решений
  styles/base.css        сброс и примитивы
  layouts/Base.astro     head, мета, OG, JSON-LD, GTM
  components/            Nav, Footer и дальше секции
  content/blog/          7 статей, markdown
  content/case-studies/  кейсы, markdown
  content.config.ts      схемы, повторяют поля CMS Webflow
  pages/                 маршруты один в один с живым сайтом
public/
  _redirects             только /concept → /#concept (301), страницы концепта больше нет
  _headers               кеш и заголовки безопасности
  robots.txt
scripts/
  live-urls.json         заморозка проиндексированных URL
  check-urls.mjs         страховка, гоняется после билда
```

## Маршруты

Статьи блога лежат под категориями, а не под `/blog/`:

| URL | Файл |
|---|---|
| `/web-design` | `pages/web-design/index.astro` (услуга) |
| `/web-design/business-website` | `pages/web-design/[slug].astro` (статья) |
| `/logo-design/professional-guide` | `pages/logo-design/[slug].astro` |
| `/web-development/webflow-vs-framer` | `pages/web-development/[slug].astro` |
| `/case-studies/dreamie` | `pages/case-studies/[slug].astro` |
| `/blog` | `pages/blog.astro` (список всех статей) |
| `/blog/wordpress-vs-webflow-...` | `pages/blog/[slug].astro` (старая статья, коллекция `legacy`) |

Категория статьи в frontmatter поле `category`, она же первый сегмент URL.

## Картинки

Только через `<Image />` из `astro:assets`. Исходники в `src/assets/`,
не в `public/`. Astro сам сделает webp и нужные размеры.
`alt` переносится из Webflow, пустой `alt=""` только для декоративных.

## Формы

`/careers` уходит на Web3Forms. Ключ в переменной `PUBLIC_WEB3FORMS_KEY`,
задаётся в настройках Cloudflare Pages, в репозиторий не коммитится.

## Команды

```bash
npm run dev      # локально
npm run build    # сборка в dist/
npm run urls     # ни один URL не потерялся
npm run assets   # ни одна картинка не битая
npm run verify   # всё вместе, гонять перед каждым деплоем
```

## Где мы сейчас

Перенесено из Webflow:

- 26 живых URL, все отдают 200, `npm run urls` зелёный
- title и description всех страниц, дословно из Webflow
- 7 статей блога: текст, ссылки, картинки, теги, даты, авторы
- 28 вопросов FAQ, привязаны к статьям, схема FAQPage сохранена
- 6 кейсов с галереями, цитатами клиентов и ссылками на живые сайты
- 1 старая статья про WordPress vs Webflow, которая жила вне CMS
- 270 картинок, видео и Lottie из экспорта кода

Осталось:

- **Ассеты CMS.** 128 файлов не входят в экспорт кода Webflow, они лежат
  на CDN. Скачиваются скриптом `download-cms-assets.sh`, содержимое папки
  `cms/` кладётся в `public/cms/`. До этого `npm run assets` красный.
- **Вёрстка статических страниц.** Контент и мета на месте, разметку
  секций надо собрать: главная, services, concept, templates, redesign,
  и три страницы услуг.
- **Главная.** Перенесена из превью D в `index.astro`: данные в `src/data/home.ts`, стили `styles/home.css`, поведение `scripts/home.js`, медиа в `public/home/`.

## Новый дизайн (стиль D, сентябрь 2026)

- Токены D в `tokens.css`, общие компоненты (кнопки, метки, faq, карточки, тёмный блок `.ob`, prose) в `base.css`.
- `Nav.astro` белая полоса, `Footer.astro` тёмный с частицами, `CtaBand.astro` тёмный блок «Want one for your website?».
- Эффекты (курсор-комета на canvas, отпечатки на кнопке, мерцающие звёзды в футере, пятна) в `src/scripts/site.js`, подключены в `Base.astro`.
- Готово в новом стиле: главная, кейсы, список блога, все статьи (`components/PostPage.astro`), услуги web-design, web-development, logo-design, services (`components/ServicePage.astro`), /call (Cal.com unrootdesign/30min), terms, privacy.
- Все 26 страниц в новом стиле. /redesign (hero roast $129) не показываем в навигации и футере, ссылку Adam отправляет лично.
- Careers: форма шлёт заявки через Web3Forms (бесплатно, 250 в месяц). Без `PUBLIC_WEB3FORMS_KEY` форма пишет, что не подключена.
- Видео кейсов переименованы из `.txt` в `.mp4` (копии в `public/cms/`).

## Что стоит поправить, но это не блокер

- У картинок в статьях нет alt. В Webflow стояло `__wf_reserved_inherit`,
  то есть пусто. Поля `coverAlt` и `alt` в галереях ждут текста.
- У четырёх страниц (careers, concept, terms, privacy) в Webflow вообще
  не было meta description. Написаны новые, можно переписать.
- В текстах статей встречаются длинные тире. Это опубликованный контент,
  который уже ранжируется, поэтому трогать не стал. Если менять, то
  отдельной задачей и после того, как позиции устаканятся.

- Все кнопки «Get a concept» ведут на Stripe, «Discuss a project» на /call. Ссылки в `src/data/links.ts`.
- Внутренние страницы на белом фоне, секции делятся только тонкой линией. Тёмный блок с предложением только на главной, на остальных страницах его роль играет футер.
- У видео на /call есть превью `public/images/call-poster.webp` (кадр из самого видео), видео грузится только по клику.
- На главной в секции Let’s talk (#team, бывшая About us) встроен календарь Cal.com unrootdesign/30min, как на старом Webflow в блоке «Why founders work with us». Скрипт грузится, только когда секция близко.
- Фон правой колонки главной `--bg` теперь очень светлый фиолетовый (смесь --pale и белого). На нём canvas `.sky`: белые звёзды стоят на месте и медленно гаснут и загораются. Плюсики на стыках секций убраны.
