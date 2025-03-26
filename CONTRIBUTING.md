# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is managed using [Bun](https://bun.sh/). It contains:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, install required dependencies in the root directory:

```sh
bun install
```

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or XCode to edit the native code, you can open the `example/android` or `example/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `example/ios/OpenTelemetryExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > react-native-open-telemetry`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `react-native-open-telemetry` under `Android`.

To work on the example app, navigate to the `/example` directory. From there you can use various commands to work with the project.

To start the packager:

```sh
bun run start
```

To run the example app on Android:

```sh
bun run android
```

To run the example app on iOS:

```sh
bun run ios
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "OpenTelemetryExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
bun typecheck
bun lint
```

Please see [this oxlint doc](https://oxc.rs/docs/guide/usage/linter/automatic-fixes.html#automatic-fixes) for applying formatting fixes automatically.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

### Linting

We use [TypeScript](https://www.typescriptlang.org/) for type checking and [OXLint](https://oxc.rs/docs/guide/usage/linter.html) for linting and formatting the code.

### Publishing to npm 🚧

We use [changesets](https://github.com/changesets/changesets) for managing versions, though this is a manual process for now in the experimental phase.

### Scripts

The `package.json` file contains various scripts for common tasks:

- `bun i`: setup project by installing dependencies.
- `bun typecheck`: type-check files with TypeScript.
- `bun lint`: lint files with Oxlint.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
