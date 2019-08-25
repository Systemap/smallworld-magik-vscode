// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');

class gisAliases{
    constructor(swgis) {
        this.swgis = swgis;
        this.codeActions=[]
        this.aliasCommands=[];
    }
        
    run(context,disposable) {

        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                triggerUpdateDecorations(editor);
            }
		}, null, context.subscriptions);
		
        vscode.workspace.onDidChangeTextDocument(event => {
			let editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                triggerUpdateDecorations(editor);
            }
		}, null, context.subscriptions);
		
        var timeout = null;
        function triggerUpdateDecorations(editor) {
            if(editor.document.languageId != "swgis")  
                return;
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(updateDecorations,500,editor);
        }

        function updateDecorations(activeEditor) {
            if (!activeEditor) 
                return;
            else if(activeEditor.document.languageId != "swgis")  
                return;
            // create a decorator type that we use to decorate labels
            const crosshairType = vscode.window.createTextEditorDecorationType({
                // cursor: 'alias',
               // backgroundColor: 'rgba(0,0,0,0.5)',
			    color: 'rgba(255,64,0,1)',
                border: "1px solid rgba(255,64,0,0.2)",
                width: "1px"
            });
            var doc = activeEditor.document;
            // const gis = '%SMALLWORLD_GIS%\\bin\\x86\\gis.exe -a '+activeEditor.document.uri.fsPath+' ';
            var regEx = /[\w_\d-!?]+:\s?\n/g; // 
            const text = doc.getText();
            const labelLines = [];
            let match;
            while (match = regEx.exec(text)) {
                const startPos = doc.positionAt(match.index);
				if (startPos.character > 0) continue;
                const endPos = doc.positionAt(match.index + match[0].length);
                const decoration = { range: new vscode.Range(startPos, endPos)};//, hoverMessage: gis+match[0] };
                labelLines.push(decoration);
            };
            if(labelLines.length)   
                activeEditor.setDecorations(crosshairType, labelLines);
        }

        let editor = vscode.window.activeTextEditor;
        if (editor && editor.document && editor.document.languageId == "swgis") {
            triggerUpdateDecorations(editor);
        }
    }
    
    provideCodeActions(document, range, context, token) {
        const swgis = this.swgis;
        if (swgis.getActiveSession()) return;
        if (swgis.gisPath.length==0) return;

        var pos = range.start;
        var aliasName = document.lineAt(pos.line).text;
        aliasName = aliasName.split("#")[0].trim()
        if (!swgis.aliasePattern.test(aliasName)) return null;
            if (aliasName.split(" ").length>1) return null;
        aliasName = aliasName.split(":")[0]
        var codeActions = [];
        var commands = this.get_aliasCommands(aliasName, document.fileName);
        for (var i in commands) {
            let cmd = commands[i];
            const ask = {value: cmd.session, tooltip: cmd.session};    
            const runAction = new vscode.CodeAction(cmd.session, ask);// vscode.CodeActionKind.Empty);
            runAction.command = cmd;
        //runAction.diagnostics = [ diagnostic ];
        codeActions.push(runAction);
        }

        swgis.codeAction = codeActions;
        return codeActions;
    }

    provideHover(document, position, token) {
        const swgis = this.swgis;
        var alias = document.lineAt(position.line).text;
        alias = alias.split("#")[0].replace(/\s+/,'');
        if (swgis.aliasePattern.test(alias)){
            alias = alias.split(":")[0].trim()
            if (swgis.getActiveSession()) {
                return this.mHover('Terminal session is active: ' + swgis.aliasStanza);
            } else if (swgis.gisPath.length==0) {
                return this.mHover("Configure swgis.gisPath");
            } else {
                return this.mHover('# GIS Command: -a '+document.fileName+' '+alias);
            }
        }
    }
    
    mHover(message) {
        let swgis=this.swgis;
        let msgHover = swgis.errorHover;
        if (!msgHover){
            msgHover = [];
            let hoverTexts = new vscode.MarkdownString();
            hoverTexts.appendCodeblock("Set swgis.gisPath in Settings to run an alias:","magik");
            hoverTexts.appendCodeblock("{ \"swgis.gisPath\" : [\"C:/Smallworld/core/bin/x86/gis.exe\"] }","magik");
            msgHover['Configure swgis.gisPath'] = new vscode.Hover(hoverTexts);
        };
        swgis.errorHover = msgHover;

        if  (!msgHover[message]){
            let hoverTexts = new vscode.MarkdownString();
            hoverTexts.appendCodeblock(message);
            msgHover[message]= new vscode.Hover(hoverTexts);
        };
        return msgHover[message];
    }

           
    get_aliasCommands(aliasName,aliasFile) {
        const swgis = this.swgis;
       const codeActions = this.aliasCommands;
        if (codeActions[aliasName]) 
            return codeActions[aliasName];
        else 
            codeActions[aliasName]=[];    

        for (var i in swgis.gisPath) {
            let gisPath = swgis.gisPath[i];
            var titleAction = "Run GIS " +gisPath + " " + aliasName;
            const args = ["-p " + gisPath + " -a " + aliasFile + " " + aliasName];
            let command = {
                session:  titleAction,
                command:  "swSessions.gisCommand",
                arguments: args,
                tooltip: titleAction
            };
            //runAction.diagnostics = [ diagnostic ];
            codeActions[aliasName].push(command);
        }

        return codeActions[aliasName];
        }


}
exports.gisAliases = gisAliases    
