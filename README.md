# Code Inspector Plugin

Integrates Code Inspector analysis engine into VS Code. You can download it from the [VS Code marketplace](https://marketplace.visualstudio.com/items?itemName=code-inspector.code-inspector-vscode-plugin) directly.
This plugin analyzes code for 12+ languages without installing any additional tools.

It checks the same rules in your VS Code editor than in your CI/CD pipeline when using [Code Inspector](https://www.code-inspector.com) for checking your code quality.

## Supported Languages

C, C++, Java, Javascript, Typescript, Python, Dart, Ruby, PHP, Scala, Apex, Terraform, Docker, Go, Shell, YAML and many more!

## Setup

### Getting API keys from Code Inspector

You need to get API keys from [Code Inspector](https://code-inspector.com).
Log on [Code Inspector](https://frontend.code-inspector.com) using your GitHub, GitLab or Bitbucket account.

Then, in your preferences, generate a new API key as shown below.

![Generate API keys in Code Inspector profile](https://raw.githubusercontent.com/codeinspectorio/vscode-plugin/main/images/get-keys.png?raw=true)

Your access and secret keys are then generated: all you need is to add them to your VS Code Plugin configuration.


### Add keys in the VS Code extension

Enter your API keys in your VS Code extension, as shown below.

![Enter your API keys](https://github.com/codeinspectorio/vscode-plugin/blob/main/images/configuration.png?raw=true)


## Using Code Inspector in your CI/CD pipeline

You can run the same rules in your codebase during your CI/CD pipeline and/or automate your code reviews.

You can easily integrate Code Inspector with

 - GitHub using the [GitHub App integration](https://github.com/marketplace/code-inspector)
 - Bitbucket using the [Bitbucket App integration](https://marketplace.atlassian.com/apps/1222117/code-inspector)
 - Any other CI/CD pipeline (see our documentation)

## Sending feedback

You can either fill a [bug report](https://github.com/codeinspectorio/vscode-plugin/issues) directly.
If you do not want to open a ticket, you can also directly [contact us](https://code-inspector.com/contact). 

## Release Notes

### Version 0.0.2

 - More documentation
 - New bundle package

### Version 0.0.1

 - Initial release

## Learn More
 * [Official Documentation](https://docs.code-inspector.com)
 * [List of all supported languages](https://doc.code-inspector.com/docs/faq/#what-languages-are-supported)
 * [Privacy Policy](https://code-inspector.com/privacy)
