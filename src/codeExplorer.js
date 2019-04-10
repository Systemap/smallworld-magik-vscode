// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require("vscode");
const fs=require("fs");
const os=require("os");
const cBrowser = require('./codeBrowser');
const magikParser = require('./magikParser');

class codeExplorer {
    constructor(swgis) {
        this.swKindToCodeKind = {
            'package':vscode.SymbolKind.Package,
            'import': vscode.SymbolKind.Namespace,
            'var':    vscode.SymbolKind.Variable,
            'type':   vscode.SymbolKind.Interface,
            'func':   vscode.SymbolKind.Function,
            'const':  vscode.SymbolKind.Constant,
        };
        this.symbols = [];
        this.swgis = swgis;
    }

    provideHover(document, position, token) {

        var commands = this.get_aproposCommands(document, position)
        if (!commands) return;

        const contents = new vscode.MarkdownString();
        for (var i in commands ){
            var cmd = commands[i];
            const args = encodeURIComponent(JSON.stringify( [cmd]))
            const commandUri = vscode.Uri.parse(`command:swSessions.apropos?${args}`);
            if (i >0) contents.appendMarkdown(`  ${"\n"}`);
            contents.appendMarkdown(` [${cmd}](${commandUri})`,"magik");
        }
        contents.isTrusted = true;
        return new vscode.Hover(contents);
    }

    get_aproposCommands(document, pos) {

        let swgis = this.swgis;
        if ( !swgis.sessions ) return;

       	var range = document.getWordRangeAtPosition(pos,/^[a-z_0-9!?]+\.\w[a-z_0-9!?]+/i);
        if (!range || range.isEmpty) return;
        var codeWord = document.getText(range).trim().split(".");
        if (codeWord.length < 2) return;

        var commands = [];
        var exm = codeWord[0].toLowerCase();
        var mtd = codeWord[1].toLowerCase();
        if (exm=="self") return;
        commands.push("apropos(:"+exm+")");
        commands.push(exm+".apropos(:"+mtd+")");
        commands.push(exm+".apropos(\"\")");
        return commands ;
    }

    provideCodeActions(document, range, diagnostics, token) {
// console.log("provideCodeActions range:"+range.start.line+" "+document.fileName);
        var commands = this.get_compileCommands(document, range)
        var codeActions = [];
        for (var i in commands ){
            var cmd = commands[i];
            const anAction = new vscode.CodeAction(cmd.title, {value: cmd.title, tooltip: cmd.title});// vscode.CodeActionKind.Empty);
            anAction.command = cmd
            //runAction.diagnostics = [ diagnostic ];
            codeActions.push(anAction);
        }
        return codeActions;
    }

    provideWorkspaceSymbols(query, token) {
        let rootPath = vscode.workspace.rootPath;
        var aTextEditor = vscode.window.activeTextEditor;

        if (aTextEditor)
            rootPath = vscode.workspace.getWorkspaceFolder(aTextEditor.document.fName).fName.fsPath;
      
        let swConfig = vscode.workspace.getConfiguration('magik', aTextEditor ? aTextEditor.document.fName : null);
        if (!rootPath && !swConfig.gotoSymbol.includeGoroot) {
            vscode.window.showInformationMessage('No workspace is open to find symbols.');
            return;
        };
        var fileSignitures = [".magik",".xml","\module.def","\product.def","\gis_aliases","\environment.bat"];
        const swgis = this.swgis;
        const swWorkspaceSymbols = swgis.swWorkspaceSymbols;
        const cB =  new cBrowser.codeBrowser(swgis);
        // --- grab symbols from files and push to index
        var grab =  function (err, magikfiles) { 
            if (err) return ;
            magikfiles.forEach(function(fName) {
                if ( swWorkspaceSymbols.index.indexOf(fName) < 0 ) {    
                    let fNamef = fName; // vscode.file(fName)//  fName.file(fName);
                    let openDocPromise = vscode.workspace.openTextDocument(fNamef);
                    openDocPromise.then(function(doc){
                        var symbols = cB.provideDocumentSymbols(doc);
                        swWorkspaceSymbols.cache.push(symbols);    
                        swWorkspaceSymbols.index.push(fName);  
                    });       
                };       
            });
        };
        // --- walk thru the folders for .magik files
        var walk = function(dir, done) {
            var results = [];
            fs.readdir(dir, function(err, list) {
                if (err) return done(err);
                var i = 0;
                (function next() {
                var file = list[i++];
                if (!file) return done(null, results);
                file = dir + '/' + file;
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                    } else {
                      for(var f in fileSignitures)
                        if(file.endsWith(fileSignitures[f])) {
                            results.push(file);
                            break;
                        };
                        next();
                    }
                });
                })();
            });
        };        

        // --- sift the symbols for 'query'
        var sift = function(symbolCache,filter) {
            let list = [];
            var n;
            for (n in symbolCache) {
                if (filter=='')
                    list = list.concat(symbolCache[n]);
                else 
                    symbolCache[n].forEach(function(symb){
                        if(symb.name.indexOf(filter)>=0) list.push(symb);
                    });      
            };      
            // console.log(filter + " : " + list.length);
            return list;      
       };    

        if (swWorkspaceSymbols.paths.indexOf(rootPath)<0) {
            walk(rootPath, grab);    
            swWorkspaceSymbols.paths.push(rootPath);
        };

        return sift(swWorkspaceSymbols.cache,query); 
    }
    
    resolveWorkspaceSymbol(symbolInfo, token) {
        console.log("--- resolveWorkspaceSymbol --- "+symbolInfo);
    }   

    get_compileCommands(document, range, context, token) {
        let swgis = this.swgis;
        if ( swgis.sessions == null) return[];

        var fName = document.fileName.split("\\");
        fName = fName[fName.length-1];
        var fPath = document.fileName.split("\\"+fName)[0];
        if (fName=="gis_aliases") return ;

        var codeBlock;
        var titleAction = "";//swgis.aliasStanza;
        var p1 = range.start;
        var p2 = range.end;
        if (fName=="product.def") {
            var pName = this.getProductModuleName(document);
            if (!document.lineAt(p1.line).text.startsWith(pName)) return;
            codeBlock = "smallworld_product.add_product(\""+fPath+"\")\n";
            titleAction += " Add Product ("+ pName+")";

        } else if (fName=="module.def"){
            if (p1.line > 0) return;
            var mName = this.getProductModuleName(document);
            if (!document.lineAt(p1.line).text.startsWith(mName)) return;
            codeBlock = "_try\n\tsmallworld_product.add_product(\""+fPath+"\\..\")\n\tsw_module_manager.load_module(:"+mName+")\n_when error\n\tsw_module_manager.load_module_definition(\""+fPath+"\")\n\tsw_module_manager.load_module(:"+mName+")\n_endtry";
            titleAction += "Load Module ("+ mName+")";

        } else if (fName=="load_list.txt"){
            codeBlock = "load_file_list(\""+fPath+"\")\n";
            titleAction += "Load File List ("+ fPath+")";

        } else if (fName=="patch_list.txt"){
            codeBlock = "sw!update_image(\""+fPath+"\")\n";
            titleAction += "Load Patch List ("+ fPath+")";

        } else if (p1.line==p2.line && p1.character==p2.character){
            titleAction += "Compile Code Line " + (p1.line+1) + ":" + (p1.character+1);
            // codeBlock = this.packageCode("Range",document);
            codeBlock = "Range";

        } else {
            // codeBlock = this.packageCode("Selection",document,range);
            codeBlock = "Selection";
            p1 = (range.start.line+1) + ":" + (range.start.character+1);
            p2 = (range.end.line+1) + ":" + (range.end.character+1);
            titleAction += "Compile Code Range "+ p1+ " - "+  p2;
        };
        if (!codeBlock) return [];
        var command = {
            title:    titleAction,
            command:  "swSessions.compileCode",
            arguments: [codeBlock],
            tooltip: titleAction
        }
        return [command];    
    }

    getProductModuleName(document) {
        for (var i=0 ; i < document.lineCount; ++i){
            var p2 = document.lineAt(i).text.split(/[#\s]/)[0].trim();
            if (p2!="") return p2;
        }
    }

    find_foldingRange(doc, pos) {
        const swgis = this.swgis ;
        var swWorkspaceSymbols = swgis.swWorkspaceSymbols;
        var fName = doc.fileName;
        // if ( swWorkspaceSymbols.index.indexOf(fName) < 0 ) {    
        //     let openDocPromise = vscode.workspace.openTextDocument(fName);
        //     openDocPromise.then(function(doc){
        //         const cB =  new cBrowser.codeBrowser(swgis);
        //         var symbols = cB.provideDocumentSymbols(doc);
        //         swWorkspaceSymbols.cache.push(symbols);    
        //         swWorkspaceSymbols.index.push(fName);  
        //     });       
        // }   
        
        var i = swWorkspaceSymbols.index.indexOf(fName);
        var symbols = swWorkspaceSymbols.cache[i];
        if (symbols)
            pos = pos.line + pos.character/1000;
            for (var i in symbols){
                var range = symbols[i].location.range;
                var p1 = range.start.line;//+ range.start.character/1000;
                var p2 = range.end.line; //+ range.end.character/1000;

                if (pos >= p1 && pos <= p2){
                    p1 = new vscode.Position(range.start.line, 0);
                    p2 = new vscode.Position(range.end.line+1,0);
                    return new vscode.Range( p1, p2);
                    // return range;
                }
            }
            // return new FoldingRange(keyLine, endLine); //, FoldingRangeKind.Region);
    }

    packageCode(context, doc, range){

        var codeBlock = '';
        switch(context) {
            case 'Error':
                return  "\"VSCode: failed to compile Magik code.\"";
            case 'Code':
                codeBlock = doc.getText(range);
                break;
            case 'Selection':
                if (!range)
                    range = vscode.window.activeTextEditor.selection;
                if (!range.isEmpty)
                    codeBlock = doc.getText(range);
                break;
            case 'Range':
                if (!range)
                    range = vscode.window.activeTextEditor.selection;
                var pos= range.start;
                range = this.find_foldingRange(doc,pos);
                if (range) 
                    codeBlock = doc.getText(range);
                break;
             default: 
                codeBlock = context;
                context = 'Code';
        }
        if (codeBlock.trim().length==0) return;
        else if (context != 'Code')  return codeBlock;

        var tmp = doc.fileName.split('\\');
        tmp = os.tmpdir()+"/"+tmp[tmp.length-1]
        for(var n=10; n<100;++n){
            try {
                fs.writeFileSync(tmp+n,codeBlock);
                return "load_file(\""+tmp+n+"\")";
            }
            catch(err) {
                if(n>9) 
                    return "\"VSCode: failed to package Magik code "+tmp+n+"\"";
            }
        }
    }

    compileCode(context,editor,edit){

        let swgis = this.swgis;
        if ( !swgis.sessions ) return;
        if ( !editor) editor = vscode.window.activeTextEditor;
        var doc = editor.document
        
        // check the context comes from a valid language id
        var codeBlock,range 
        switch (context) {
            case 'Selection':
                range = editor.selection;
            case 'Code','Range':
                if (doc.languageId != "magik") return;      
            default:
                //codeBlock already built   
        }
        codeBlock = this.packageCode(context, doc, range)

        if (!codeBlock) 
            codeBlock = this.packageCode('Error', doc);
        var cp = swgis.sessions
        cp.sendText(codeBlock);
    }
    
    apropos(context,editor,edit){
        
        let swgis = this.swgis;
        if ( !swgis.sessions ) return;
        if ( !editor) editor = vscode.window.activeTextEditor;
        var doc = editor.document

        if (!context){
            var pos = editor.selection.start;
            context = this.get_aproposCommands(doc,  pos);
            if (!context) return;
        } else if (context=="ClassBrowser"){
                context = this.get_classBrowser();
                if (!context) return;
        }
//        context = this.packageCode(context, doc, range);

        if (!context) 
            context = this.packageCode('Error', doc);
        var cp = swgis.sessions
        cp.sendText(context);
    }

}
exports.codeExplorer = codeExplorer;
