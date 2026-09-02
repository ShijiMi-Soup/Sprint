# Documentation publishing

## Recommendation

Publish Sprint's documentation with **VitePress on GitHub Pages**.

This combination fits the repository because:

- the existing documentation is Markdown;
- Sprint already uses a Node and TypeScript toolchain;
- VitePress provides navigation, local search, and language-specific sections;
- GitHub Pages can deploy the generated site from GitHub Actions without a
  separate hosting account;
- the site can start at `https://shijimi-soup.github.io/Sprint/` and move to a
  custom domain later.

Use the stable VitePress release when the site is configured. Keep English at
the site root and place Japanese pages under `docs/ja/` so the language selector
can map equivalent pages.

## Alternatives

| Platform | Use it when | Tradeoff |
| --- | --- | --- |
| GitHub Pages with plain Jekyll | You want the fewest Node dependencies and a simple site. | Less convenient documentation navigation, search, and bilingual configuration. |
| Docusaurus | You need formal documentation versioning and a larger multilingual site. | More framework and content structure than Sprint currently needs. |
| Read the Docs with MkDocs | You prefer a documentation-specific hosted service. | Adds another service and build configuration outside the existing GitHub release workflow. |

## Proposed site structure

```text
docs/
|-- .vitepress/
|   `-- config.ts
|-- index.md
|-- reference.md
|-- installation.md
|-- ja/
|   |-- index.md
|   |-- reference.md
|   `-- installation.md
`-- public/
    `-- images/
```

The current uppercase filenames can remain while content is prepared, but the
site setup should either use stable lowercase routes or define redirects before
public links are advertised.

## Publication workflow

1. Add VitePress as a development dependency.
2. Add `docs:dev`, `docs:build`, and `docs:preview` scripts.
3. Configure the GitHub Pages base path as `/Sprint/`.
4. Configure English and Japanese locales and local search.
5. Add a GitHub Actions workflow that builds and deploys `docs/.vitepress/dist`.
6. Add `npm run docs:build` to the repository verification workflow.
7. In the repository's **Settings -> Pages**, select **GitHub Actions** as the
   publishing source.

Do not publish the site until the Japanese reference has been written or the
language navigation clearly labels untranslated pages as English.
