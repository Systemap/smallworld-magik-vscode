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
        
    run(context) {

        let activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || !activeEditor.document.fileName.endsWith("gis_aliases")) return ;

        triggerUpdateDecorations();
 
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
                border: "1px solid rgba(255,64,0,0.2)",
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
        const swgis = this.swgis;
        if ( swgis.sessions != null) return;
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
            const cak = {value: cmd.title, tooltip: cmd.title};    
            const runAction = new vscode.CodeAction(cmd.title, cak);// vscode.CodeActionKind.Empty);
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
        alias = alias.split("#")[0].trim()
        if (swgis.aliasePattern.test(alias)){
            alias = alias.split(":")[0].trim()
            if (swgis.sessions) {
                return this.mHover('Session is runing');
            } else if (swgis.gisPath.length==0) {
                return this.mHover("Configure swgis.gisPath");
            } else {
                return this.mHover(alias,document.fileName);
            }
        }
    }

    mHover(message, aliasPath) {
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
            if (aliasPath) {
                var commands = this.get_aliasCommands(message,aliasPath);
                for (var i in commands) {
                    let cmd = commands[i];
                    const args = encodeURIComponent(JSON.stringify(cmd.arguments))
                    const commandUri = vscode.Uri.parse(`command:swSessions.runaliases?${args}`);
                    if (i >0) hoverTexts.appendMarkdown(`${"\n"}---${"\n"}`);
                    hoverTexts.appendMarkdown(`* [${cmd.title}](${commandUri})`);
                }
                hoverTexts.isTrusted = true;
            } else 
                hoverTexts.appendCodeblock(message);
            msgHover[message]= new vscode.Hover(hoverTexts);
        };
        return msgHover[message];
    }
    
    
    get_aliasCommands(aliasName, aliasPath) {
        const swgis = this.swgis;
       const codeActions = this.aliasCommands;
        if (codeActions[aliasName]) 
            return codeActions[aliasName];
        else 
            codeActions[aliasName]=[];    

        for (var i in swgis.gisPath) {
            let gisPath = swgis.gisPath[i];
            var titleAction = "Run GIS " +gisPath + " " + aliasName;
            const args = [aliasName, aliasPath, gisPath ];
            let command = {
                title:    titleAction,
                command:  "swSessions.runaliases",
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
