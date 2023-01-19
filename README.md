[![Slack](https://img.shields.io/badge/Slack-@codigahq.svg?logo=slack)](https://join.slack.com/t/codigahq/shared_invite/zt-9hvmfwie-9BUVFwZDwvpIGlkHv2mzYQ)
[![Twitter](https://img.shields.io/badge/Twitter-getcodiga-blue?logo=twitter&logoColor=blue&color=blue)](https://twitter.com/getcodiga)
[![Visual Studio Marketplace](https://img.shields.io/badge/Visual%20Studio%20Marketplace-Download-blue)](https://marketplace.visualstudio.com/items?itemName=codiga.vscode-plugin)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/codiga.vscode-plugin)](https://marketplace.visualstudio.com/items?itemName=codiga.vscode-plugin)
[![Code Grade](https://api.codiga.io/project/29693/status/svg)](https://app.codiga.io/public/project/29693/vscode-plugin/dashboard)
[![Code Quality](https://api.codiga.io/project/29693/score/svg)](https://app.codiga.io/public/project/29693/vscode-plugin/dashboard)

[Codiga](https://www.codiga.io): static code analysis on steroids 🚀

Analyze, check and automatically fix security vulnerabilities and coding mistakes from your IDE.

- Works for Python, JavaScript and TypeScript.
- Fix security vulnerabilities and coding mistakes from your IDE
- Let you write your own custom rules ([tutorial](https://app.codiga.io/hub/tutorial) or [documentation](https://doc.codiga.io/docs/rosie/rosie-introduction/))

![Check Python Naming](images/python-naming.gif)

## Getting Started 🏃‍♀️

### Automatic 🙌

Run the following command at the _root_ of your project.

```bash
npx @codiga/cli@latest ruleset-add
```

It will create a `codiga.yml` file at the root of your project, which is used to know what rulesets to use. You can refine the rulesets later and rulesets you find on the [Codiga Hub](https://app.codiga.io/hub/rulesets).

### Manually 🐌

1. Add your API key (see below)
2. Visit the [Codiga Hub](https://app.codiga.io/hub/rulesets) and select the rulesets to use for your project.
3. Create a `codiga.yml` at the root of your project with the list of rulesets you want to use. An example of a `codiga.yml` file for Python is shown below.

```yaml
rulesets:
  - python-security
  - python-best-practices
```

## API keys

To use Codiga, you need an API Token from [Codiga](https://codiga.io).
Log on [Codiga](https://app.codiga.io) using your GitHub, GitLab, Bitbucket or Google account.

Then, in your preferences, generate a new API key as shown below.

![Generate API Token on Codiga](images/api-token-creation.gif)

Add the token in your VS Code preferences.

![Enter your API keys](images/configuration.png)

## Sending feedback

You can either fill a [bug report](https://github.com/codiga/vscode-plugin/issues) directly.
If you do not want to open a ticket, you can also directly [contact us](https://codiga.io/contact).

## Learn More

- [Official Documentation](https://doc.codiga.io/docs/coding-assistant/coding-assistant-vscode/)
- [List of all supported languages](https://doc.codiga.io/docs/faq/#what-languages-are-supported)
- [Privacy Policy](https://www.codiga.io/privacy)
