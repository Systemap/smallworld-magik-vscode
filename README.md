# Language support for Smallworld™ Magik

This is a fast and modern IDE for [Smallworld](https://en.wikipedia.org/wiki/Smallworld) application development and [Magik](https://en.wikipedia.org/wiki/Magik_%28programming_language%29) programming language.

## Features

* Language grammar for Magik, gis_aliases, product.def, module.def, and message files.
* Autocorrection for Magik keywords.
* IntelliSense and auto-complete for Magik code and popular Smallworld commands.
* Symbol Provider for Magik and gis_aliases contents.
* Magik traditional light theme.  
* Start Smallworld sessions from gis_aliases stanzas. (Contributor: [MarkerDave](https://github.com/MarkerDave) )

## For Magik Developers

* Open a Smallworld Product folder as a Workspace, or click on a Magik source file to activate this extension.
* Open a Magik file to see the code outline for Objects and methods in the file.
* Start typing Magik code to get keyword autocorrections and autocomplete features.

![Snippet](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/snippet.png)

* open the Symbol browser by CTRL-T and see a list of Object Exemplars, Methods, and Procs in the entire product tree, and click to jump to a definition.

![CTRL-T](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/CodeOutline.png)

* Change the colour Theme to Smallworld Magik to get a traditional Light theme.

![Smallworld Magik Theme](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/syntaxLight.png)

## Start Smallworld sessions from gis_aliases stanzas. (Contributor: [MarkerDave](https://github.com/MarkerDave) )

* Set you gis.exe path in the settings: { "Smallworld.gisPath": "{your sw install directory}/gis.exe" }.
* Open a gis_aliases file, the stanzas appear boxed in Orange and have Code Actions (Yellow light bulb).
* Click the Light Bulb to get the command to Start a Smallworld Session.

![Run GIS Alias](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/SWRunGisAlias.png)

This is tested with Smallworld 4.3 and Smallworld 5.1.9

## Extension Settings

This extension contributes to the following settings:

* languages, grammars, themes, snippets, commands, menus.

## Release Notes

### 1.1.0

* Document Symbol Provider and Workspace Symbol Provider for supported extensions.
* SWGIS Run Alias command by [MarkerDave](https://github.com/MarkerDave)
* Magik autocorrection bug fixes and performance improvements.
* Improvements for Magik syntax colouring, supporting all complex forms of Magik Symbols.
* Snippet corrections by [codi89](https://github.com/codi89)

### 1.0.0

Basic support for Smallworld Magik source and resource file types, including Symbols and Autocorrection.

