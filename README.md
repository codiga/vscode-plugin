# Codiga VS Code Extension

Integrates Codiga analysis engine into VS Code. You can download it from the [VS Code marketplace](https://marketplace.visualstudio.com/items?itemName=code-inspector.code-inspector-vscode-plugin) directly.
This plugin analyzes code for 12+ languages without installing any additional tools.

Codiga provides two capabilities:

- use of code recipes for 12+ languages
- code analysis for 12+ languages with no setup!

![Use of recipe in Python](images/use-recipe.gif)

## Supported Languages

C, C++, Java, Javascript, Typescript, Python, Dart, Ruby, PHP, Scala, Apex, Terraform, Docker, Go, Shell, YAML and many more!

## Setup

**Note**: Setup is necessary only if you need to use your personal recipes or code analysis rules. By default, it uses a set of predefined public and safe recipes and code verification rules.

### Getting API keys from Codiga

You need an API Token from [Codiga](https://codiga.io).
Log on [Codiga](https://frontend.codiga.io) using your GitHub, GitLab or Bitbucket account.

Then, in your preferences, generate a new API key as shown below.

![Generate API Token on Code Inspector](https://raw.githubusercontent.com/codeinspectorio/vscode-plugin/main/images/api-token-creation.gif?raw=true)

Your access and secret keys are then generated: all you need is to add them to your VS Code Plugin configuration.

**Note**: use API token and no API keys. API keys (found in profile) are deprecated and will be removed in future versions.

### Add keys in the VS Code extension

Enter your API keys in your VS Code extension, as shown below.

![Enter your API keys](https://github.com/codeinspectorio/vscode-plugin/blob/main/images/configuration.png?raw=true)

## Sending feedback

You can either fill a [bug report](https://github.com/codeinspectorio/vscode-plugin/issues) directly.
If you do not want to open a ticket, you can also directly [contact us](https://code-inspector.com/contact).

## Release Notes

### Version 1.1.2

- Support new API tokens

### Version 0.0.2

- More documentation
- New bundle package

### Version 0.0.1

- Initial release

## Learn More

- [Official Documentation](https://docs.code-inspector.com)
- [List of all supported languages](https://doc.code-inspector.com/docs/faq/#what-languages-are-supported)
- [Privacy Policy](https://code-inspector.com/privacy)
