// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const { exec } = require('child_process');
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld')
const editor = vscode.window.activeTextEditor;

class swSessions{
    run(context) {

        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            triggerUpdateDecorations();
        }
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                activeEditor= editor
                triggerUpdateDecorations();
            }
        }, null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document) {
                triggerUpdateDecorations();
            }
        }, null, context.subscriptions);
        var timeout = null;
        function triggerUpdateDecorations() {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(updateDecorations, 500);
        }
        function updateDecorations() {
            if (!activeEditor) 
                return;
            else if(activeEditor.document.languageId != "swgis")  
                return;
            // create a decorator type that we use to decorate labels
            const crosshairType = vscode.window.createTextEditorDecorationType({
                // cursor: 'crosshair',
                // backgroundColor: 'rgba(32,0,0,0.5)',
                color: 'rgba(255,64,0,1)'
            });

            const gis = '%SMALLWORLD_GIS%\\bin\\x86\\gis.exe -a '+activeEditor.document.uri.fsPath+' ';
            const regEx = /[a-z_0-9-]+:[\s]\n/ig; // /:\|*\w+\<*\?*\(*\)*\!*\|*/g;
            const text = activeEditor.document.getText();
            const labelLines = [];
            let match;
            while (match = regEx.exec(text)) {
                const startPos = activeEditor.document.positionAt(match.index);
                const endPos = activeEditor.document.positionAt(match.index + match[0].length);
                const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: gis+match[0] };
                 labelLines.push(decoration);
            }
            if(labelLines.length)   
                activeEditor.setDecorations(crosshairType, labelLines);
        }
    }
    
<<<<<<< HEAD
	// ---------------------------------------------------------
   	// https://github.com/MarkerDave
    runaliases(alias){
=======
    runaliases(alias){        
>>>>>>> cc3e9dc04b56efc57c55fa4d3c740ae6b249ccb3
        try
        {
            let activeEditor = vscode.window.activeTextEditor;
            //Currently the tab of the alias file needs to be opened.
            var currentOpenTabFilePath = activeEditor.document.fileName;
            //Get gis.exe path
            var gisPath = workbenchConfig.get('gisPath');
            console.log("path: " + gisPath);
            //Get the selected text(alias).
            var selectedAlias = activeEditor.document.getText(activeEditor.selection);

            //Show some messages.
<<<<<<< HEAD
        vscode.window.showInformationMessage('Smallworld GIS Starting...');
=======
            vscode.window.showInformationMessage('Smallworld GIS Starting...');
>>>>>>> cc3e9dc04b56efc57c55fa4d3c740ae6b249ccb3
            vscode.window.showInformationMessage('using alias: ' + selectedAlias);
           
            //Start Smallworld with the correct alias
           var execCommand = gisPath +  ' -a ' + "\"" + currentOpenTabFilePath + "\""+ ' ' + selectedAlias;
           vscode.window.showInformationMessage(execCommand);
           exec(execCommand, (err, stdout, stderr) => { 
            if (err)
<<<<<<< HEAD
               return console.error(err);
           else 
               console.log(stdout);
        });
=======
                return console.error(err);
            else 
                console.log(stdout);
            });
>>>>>>> cc3e9dc04b56efc57c55fa4d3c740ae6b249ccb3
        }
         catch(err)
        {
            vscode.window.showInformationMessage(err.message);  
        }
    }
	// ---------------------------------------------------------
}
exports.swSessions = swSessions    


