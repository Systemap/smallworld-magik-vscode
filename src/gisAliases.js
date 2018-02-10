'use strict';
const vscode = require('vscode');
const { exec } = require('child_process');

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
    
    runaliases(alias){
        vscode.window.showInformationMessage('Smallworld GIS Starting...');
        exec('D:\\WDI\\Core430\\product\\bin\\x86\\gis.exe -a D:\\WDI\\adjust.IT432\\config\\gis_aliases open', (err, stdout, stderr) => {
            if (err)
               return console.error(err);
           else 
               console.log(stdout);
        });
    }
}
exports.swSessions = swSessions    


