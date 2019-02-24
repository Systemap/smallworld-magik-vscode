// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const { exec } = require('child_process');
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld');
const swgis = {codeAction: [], sessions:[]};

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
                cursor: 'alias',
               // backgroundColor: 'rgba(0,0,0,0.5)',
                border: "1px solid orange",
                width: "1px",
                color: 'rgba(255,64,0,1)'
            });

            // const gis = '%SMALLWORLD_GIS%\\bin\\x86\\gis.exe -a '+activeEditor.document.uri.fsPath+' ';
            var regEx = /[A-Za-z_0-9-]+:(\s\n|\n)/ig; // 
            const text = activeEditor.document.getText();
            const labelLines = [];
            let match;
            while (match = regEx.exec(text)) {
                const startPos = activeEditor.document.positionAt(match.index);
                const endPos = activeEditor.document.positionAt(match.index + match[0].length);
                const decoration = { range: new vscode.Range(startPos, endPos)};//, hoverMessage: gis+match[0] };
                labelLines.push(decoration);
            };
            if(labelLines.length)   
                activeEditor.setDecorations(crosshairType, labelLines);
        }

    }
    
    provideCodeActions(document, range, context, token) {
        var pos = range.start;
        var selectedAlias = document.lineAt(pos.line).text;
        selectedAlias = selectedAlias.split("#")[0].trim()
        if (/[A-Za-z_0-9-]+:$/i.test(selectedAlias))
            console.log(selectedAlias);
        else return null;

       var currentOpenTabFilePath = document.fileName;
        var codeActions = [];
        var titleAction = "Run GIS "+selectedAlias;
        const args = [selectedAlias.split(":")[0], currentOpenTabFilePath ];
        const cak = {value: titleAction, tooltip: titleAction};
        const runAction = new vscode.CodeAction(titleAction, cak);// vscode.CodeActionKind.Empty);
        runAction.command = {
            title:    titleAction,
            command:  "swSessions.runaliases",
            arguments: args,
            tooltip: titleAction
        };
        swgis.codeAction = runAction;
        //runAction.diagnostics = [ diagnostic ];
        codeActions.push(runAction);

        return codeActions;
    }

    provideHover(document, position, token) {
        
        var alias = document.lineAt(position.line).text;
        alias = alias.split("#")[0].trim()
        if (/[A-Za-z_0-9-]+:$/i.test(alias)){
            let hoverTexts = new vscode.MarkdownString();
            hoverTexts.appendMarkdown("Click for Action to run GIS Alias");
            let hover = new vscode.Hover(hoverTexts);
            return hover;
        }
    
    }
    
	// ---------------------------------------------------------
   	// https://github.com/MarkerDave
    runaliases(selectedAlias, currentOpenTabFilePath){

        try
        {
            if (!selectedAlias) {
                var args = swgis.codeAction.command.arguments
                selectedAlias = args[0];
                currentOpenTabFilePath = args[1];
            };
                //Get gis.exe path
            var gisPath = workbenchConfig.get('gisPath');
            console.log("path: " + gisPath);

           
            //Start Smallworld with the correct alias
           var execCommand = gisPath +  ' -a ' + "\"" + currentOpenTabFilePath + "\""+ ' ' + selectedAlias;

            //Show some messages.
            var sessionInfo = 'Smallworld GIS Starting...' + selectedAlias + "\n" + execCommand;
           vscode.window.showInformationMessage(sessionInfo);

           exec(execCommand, (err, stdout, stderr) => { 
                if (err)
                   return console.error(err);
                else 
                   console.log(stdout);
            });
        }
         catch(err)
        {
            vscode.window.showInformationMessage(err.message);  
        }
    }
	// ---------------------------------------------------------
}
exports.swSessions = swSessions    
