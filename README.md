# Kekpiler
 A simple JS markdown to html compiler

This JS module converts markdown source to html. The goal is to make it's inner-workings
very verbose and extensible. All parsing is done with regular expressions and rednering
happens through a primitive virtual DOM.

## How to use
Import the `index.js` file to access some convenience functions that provide a
preconfigured `Kekpiler` compiler instance. This file also serves as an example
how to configure and use the compiler.

## Syntax
The supported markdown syntax is a simplified CommonMark version. A few things
are removed for simpler parsing and rendering.

| Name | Syntax | Description | Example |
| --- | --- | --- | --- |
| Comment | `<!-- -->` | Ignored by the parser | `<!-- Comment -->`
| Header | `#` | The number of `#` defines header level | `# My header`
| Code | ` ``` ``` ` | No highlighting by default | ` ```js\n Code ``` `
| Container | `::: :::` | A html class name can be set | `:::warning\n Text::: `
| Image | `![]()` | | `![Alt text](www.url.com)`
| Custom Block | `@[]()` | Can be defined with extensions | `@[TOC][]`
| Reference | `name: url` | Maps a resource URL to a name | `image: www.url.com`
| Itemized | `-` `*` `+` | May contain nested lists | `- List item`
| Enumerated | `1. ` | The value of the number is ignored | `1. List item`
| Table | `\| \|` | The full syntax is described below |
| Quote | `>` | May contain lists and paragraphs | `> Text`

Blocks always refer to a resource, which either is a URL or the name of a reference.
This might be usefull to place long URLs at the end of the document. URLs can also
be transformed by extensions to convert database names into actual URLs with database
ids.

```md
![My image](https://www.my-imagehost-backend.org)
![My image][ref]

ref: https://www.my-imagehost-backend.org
```

Here is an example how to write a table:
```md
| Name | Syntax | Description | Example |
| --- | --- | --- | --- |
| Comment | `<!-- -->` | Ignored | `<!-- Comment -->`
| Header | `#` | The number | `# My header`
```

Styling text in paragraphs can be done with the following syntax:

| Style | Syntax | Example |
| --- | --- | --- |
| Emphasised | `_` `*` | `_important_`
| Strong | `__` `**` | `__bold__`
| Strike Through | `~` | `~removed~`

## Default Extensions
The `Kekpiler` compiler comes with a few extensions out of the box, to modularize
some of it's functionality and provide examples how to use and create extensions
yourself.

The following extensions are included and applied to the preconfigured compiler
instance:
- `HeaderSlugger` Adds unique ids to headers to make them linkable fragments
- `TableOfContents` Adds the `@[TOC]()` custom block that renders a simple
  table of contents. Headers need to be `Fragmenets` to be recognized.
- `LineBreak` Adds the `@[break][]` inline custom block that renders a html `<br\>`
  element.

## About the name
The name is based on an inside-joke with my Uni friends and a promise made to one
of them. It has no special meaning besides sounding funnny.

## License
This project is licensed under the MIT license.
