# Eventer

[![npm Module](https://badge.fury.io/js/@byojs%2Feventer.svg)](https://www.npmjs.org/package/@byojs/eventer)
[![License](https://img.shields.io/badge/license-MIT-a1356a)](LICENSE.txt)

**Eventer** ... // TODO

```js
// TODO
```

----

[Library Tests (Demo)](https://byojs.dev/eventer/)

----

## Overview

The main purpose of **Eventer** is...

## Deployment / Import

```cmd
npm install @byojs/eventer
```

The [**@byojs/eventer** npm package](https://npmjs.com/package/@byojs/eventer) includes a `dist/` directory with all files you need to deploy **Eventer** (and its dependencies) into your application/project.

**Note:** If you obtain this library via git instead of npm, you'll need to [build `dist/` manually](#re-building-dist) before deployment.

### Using a bundler

If you are using a bundler (Astro, Vite, Webpack, etc) for your web application, you should not need to manually copy any files from `dist/`.

Just `import` like so:

```js
import { /* TODO */ } from "@byojs/eventer";
```

The bundler tool should pick up and find whatever files (and dependencies) are needed.

### Without using a bundler

If you are not using a bundler (Astro, Vite, Webpack, etc) for your web application, and just deploying the contents of `dist/` as-is without changes (e.g., to `/path/to/js-assets/eventer/`), you'll need an [Import Map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) in your app's HTML:

```html
<script type="importmap">
{
    "imports": {
        "eventer": "/path/to/js-assets/eventer.mjs"
    }
}
</script>
```

Now, you'll be able to `import` the library in your app in a friendly/readable way:

```js
import { /* TODO */ } from "eventer";
```

**Note:** If you omit the above *eventer* import-map entry, you can still `import` **Eventer** by specifying the proper full path to the `eventer.mjs` file.

## Eventer API

The API provided by **Eventer**...

```js
// .. TODO
```

// TODO

## Re-building `dist/*`

If you need to rebuild the `dist/*` files for any reason, run:

```cmd
# only needed one time
npm install

npm run build:all
```

## Tests

This library only works in a browser, so its test suite must also be run in a browser.

Visit [`https://byojs.dev/eventer/`](https://byojs.dev/eventer/) and click the "run tests" button.

### Run Locally

To instead run the tests locally, first make sure you've [already run the build](#re-building-dist), then:

```cmd
npm test
```

This will start a static file webserver (no server logic), serving the interactive test page from `http://localhost:8080/`; visit this page in your browser and click the "run tests" button.

By default, the `test/test.js` file imports the code from the `src/*` directly. However, to test against the `dist/*` files (as included in the npm package), you can modify `test/test.js`, updating the `/src` in its `import` statements to `/dist` (see the import-map in `test/index.html` for more details).

## License

[![License](https://img.shields.io/badge/license-MIT-a1356a)](LICENSE.txt)

All code and documentation are (c) 2024 Kyle Simpson and released under the [MIT License](http://getify.mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
