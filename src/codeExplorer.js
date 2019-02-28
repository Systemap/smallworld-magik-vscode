// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require("vscode");
const fs=require("fs");
const cBrowser = require('./codeBrowser');

// const swWorkspaceSymbols = {index: [], cache: [], paths: []};

class codeExplorer {
    constructor() {
        this.swKindToCodeKind = {
            'package': vscode.SymbolKind.Package,
            'import': vscode.SymbolKind.Namespace,
            'var': vscode.SymbolKind.Variable,
            'type': vscode.SymbolKind.Interface,
            'func': vscode.SymbolKind.Function,
            'const': vscode.SymbolKind.Constant,
        };
        this.symbols = [];
    }
    
    provideWorkspaceSymbols(query, token) {
        let rootPath = vscode.workspace.rootPath;
        if (vscode.window.activeTextEditor && vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri)) {
            rootPath = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri).uri.fsPath;
        };
        let swConfig = vscode.workspace.getConfiguration('magik', vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri : null);
        if (!rootPath && !swConfig.gotoSymbol.includeGoroot) {
            vscode.window.showInformationMessage('No workspace is open to find symbols.');
            return;
        };
        var fileSignitures = [".magik","\module.def","\product.def","\gis_aliases","\environment.bat"];
        var cB =  new cBrowser.codeBrowser();
        var swWorkspaceSymbols = cB.swWorkspaceSymbols
        // --- grab symbols from files and push to index
        var grab =  function (err, magikfiles) { 
            if (err) return ;
            magikfiles.forEach(function(fname) {
                if ( swWorkspaceSymbols.index.indexOf(fname) < 0 ) {    
                    let urif = fname; // vscode.file(fname)//  URI.file(fname);
                    let openDocPromise = vscode.workspace.openTextDocument(urif);
                    openDocPromise.then(function(doc){
                        var symbols = cB.provideDocumentSymbols(doc);
                        swWorkspaceSymbols.cache.push(symbols);    
                        swWorkspaceSymbols.index.push(fname);  
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
    };

    resolveWorkspaceSymbol(symbolInfo, token) {
        console.log(symbolInfo);

    }    
  
}
exports.codeExplorer = codeExplorer;
