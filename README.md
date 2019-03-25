# Language support for Smallworld™ Magik

This is a fast and modern IDE for [Smallworld](https://en.wikipedia.org/wiki/Smallworld) application development and [Magik](https://en.wikipedia.org/wiki/Magik_%28programming_language%29) programming language.

## Features

* Language grammar for Magik, gis_aliases, product.def, module.def, and message files.
* Autocorrection for Magik keywords.
* IntelliSense and auto-complete for Magik code and popular Smallworld commands.
* Symbol Provider for Magik and gis_aliases contents.
* Magik traditional light theme.  
* Start Smallworld sessions from gis_aliases stanzas. (Contributor: [MarkerDave](https://github.com/MarkerDave) )
* Compile Magik code into a Smallworld 5 session. 

## For Magik Developers

* Open a Smallworld Product folder, or click on a Magik source file to activate this extension.
* Open a Magik file to see the code outline for Objects and methods in the file.
* Start typing Magik code to get keyword autocorrections and autocomplete features.

![Snippet](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/snippet.png)

* open the Symbol browser by CTRL-T and see a list of Object Exemplars, Methods, and Procs in the entire product tree, and click to jump to a definition.

![CTRL-T](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/CodeOutline.png)

* Change the colour Theme to Smallworld Magik to get a traditional Light theme.

![Smallworld Magik Theme](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/syntaxLight.png)

## Start Smallworld sessions from gis_aliases stanzas. (Contributor: [MarkerDave](https://github.com/MarkerDave) )

* Set the gis.exe path in the settings: { "Smallworld.gisPath": "{your sw install directory}/gis.exe" }.
* Open a gis_aliases file, the stanzas appear boxed in Orange and have Code Actions (Yellow light bulb).
* Click the Light Bulb to get the command to Start a Smallworld Session.
* An 'environment.bat' in the same path as gis_aliases will automatically be loaded.

![Run GIS Alias](https://github.com/siamz/smallworld-magik-vscode/raw/master/images/SWRunGisAlias.png)

This is tested with Smallworld 4.3 and Smallworld 5.1.9

* Compile Magik code, from the Code Actions for or by key sequences:
    * 'F2 b' or 'F9' to compile the current file, 
    * 'F2 r' or 'Ctrl+F9' to compile the current code block, 
    * 'F2 s' or 'Alt+F9' to compile the current code selection.
* Access Class or Method refrences in Hover Actions over 'object.method' definitions.

## Extension Settings

Open File-Preferences-Settings, expand Extensions - Smallworld GIS and click on "Edit in settings.json". Add the following entries for Smallworld gis.exe path:

    "Smallworld.gisPath": "C:/Smallworld/core/bin/x86/gis.exe",
    "Smallworld.JAVA_HOME": "C:/Smallworld/core/jre/x64",


To setup multipe gis.exe paths:

    "Smallworld.gisPath": ["C:/Smallworld/core/bin/x86/gis.exe","D:/Smallworld/product/bin/x86/gis.exe"],

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

