// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require("vscode");
const fs=require("fs");
const os=require("os");
const cBrowser = require('./codeBrowser');
const magikParser = require('./magikParser');
const gAliases = require('./gisAliases');

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
		// ---- gisAliases
		this.gAliases = new gAliases.gisAliases(swgis);
    }

    run(context) {
		// if (swgis.swWorkspace.paths.length =0 ) return;
        vscode.workspace.onDidChangeWorkspaceFolders(event => {
			if (!event) return;
			event.added.forEach(function(val,idx,arr){
				var fPath = val.uri.fileName;
				this.get_workspaceSymbols(fPath);
			});	
			event.removed.forEach(function(val,idx,arr){
				var fName = val.uri.fileName;
				var i = swWorkspace.index[fName];
				swWorkspace.symbs[i] = [];
			});	
		}, null, context.subscriptions);

		// const swgis = this.swgis;
		// var rootPath = vscode.workspace.rootPath;
		// if (rootPath && swgis.swWorkspace.paths.indexOf(rootPath)<0) {
		// 		const cB =  new cBrowser.codeBrowser(swgis);
		// 		cB.get_workspaceSymbols(rootPath);
		// }	
	}

    provideHover(document, position, token) {
		if (document.fileName.endsWith("gis_aliases"))
			return this.gAliases.provideHover(document, position, token);   

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

        const swgis = this.swgis;
        if ( !swgis.sessions ) return;

        var codeWord = magikParser.getClassMethodAtPosition(document, pos);
        if (!codeWord) return;

        var commands = [];
        var exm = codeWord[0];
        var mtd = codeWord[1];
        if (exm=="_self"||exm=="_super"||exm=="_clone") return;
		
    	var onMethod = document.getWordRangeAtPosition(pos, magikParser.keyPattern.dot_method);
		if (onMethod){
			commands.push(exm+".apropos(\""+mtd+"\")");
		} else {
        	commands.push("apropos(\""+exm+"\")");
        commands.push(exm+".apropos(\"\")");
		}
	
        return commands ;
    }
    
    provideReferences(document, position, options, token) {
        const swgis = this.swgis;
        return new Promise((resolve, reject) => {

            token.onCancellationRequested(() => reject() );

            // get current word
			var codeWord = magikParser.getClassMethodAtPosition(document, position);
			if (!codeWord) 
			    codeWord = magikParser.getSymbolNameAtPosition(document, position);
            if (!codeWord) 
			    codeWord = magikParser.getEnvironVarAtPosition(document, position);
            if (!codeWord) 
                return resolve([]);

			this.scanWorkspace(token);			
			var filter = codeWord[2].toLowerCase();
			// var exm = codeWord[0].toLowerCase();
			// var searchExp = "." + mtd;
			// var codeText = document.getText();
			// var codeUri = document.uri;
            try {
                let results = [];
                swgis.swWorkspace.refes.forEach(function(refcache){
                    var refes = refcache[filter];
                    if (refes) {
                        for (let i in refes) {
                            results.push(refes[i]) 
                        }
                    } 
                });
                resolve(results);
            }
            catch (e) {
                reject(e);
            }
        });
    }
	
	provideDefinition(document, pos, token){
        var ClassMethod = magikParser.getClassMethodAtPosition(document, pos);
		if (!ClassMethod) return;

		this.scanWorkspace(token);			

		var className = ClassMethod[0];
		var methodName = ClassMethod[1];
		var filter =  ClassMethod[2];
//    	var onClass = document.getWordRangeAtPosition(pos, magikParser.keyPattern.class_dot);

		switch (className) {
			case "_self":
				var foldR = this.find_foldingRange(document,pos);
				if (foldR){
					className = foldR.symbol.containerName
					if (className && className.length) break;
				}
			case "_super":
				className = null;
				onClass = false;	
		}

		const swgis = this.swgis ;
		const provideDefinition = function (filter, className, methodName){
			filter = new RegExp(filter,'i')
			var swWorkspace = swgis.swWorkspace;
			var locations = [];
			swWorkspace.symbs.forEach(function(symbols) {
            for (var i in symbols){
				var symbol = symbols[i];
						if (symbol.name.search(filter)!=0) 
							continue;
						else if (methodName == symbol.name)  
							locations.unshift( symbol.location );
						else if (className == symbol.containerName)  
							locations.unshift( symbol.location );
						else 
							locations.push( symbol.location );
                }
			});

			if (locations.length >0) 
				return  locations;		 
  		}
		return provideDefinition(filter, className, methodName);
	}

    provideCodeActions(document, range, diagnostics, token) {
		if (document.fileName.endsWith("gis_aliases"))
			return this.gAliases.provideCodeActions(document, range, diagnostics, token);   

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

    scanWorkspace(token, rootPath) {
		const swgis = this.swgis;
		if(rootPath){
			if (swgis.swWorkspace.index.indexOf(rootPath)<0) {
				const cB =  new cBrowser.codeBrowser(swgis);
				cB.get_workspaceSymbols(subPath);
			}			
		} else {
			rootPath = vscode.workspace.rootPath;
			if ( swgis.swWorkspace.paths.indexOf(rootPath)<0 ) {
				const cB =  new cBrowser.codeBrowser(swgis);
				cB.get_workspaceSymbols(rootPath);
			}
			for(var i in vscode.workspace.workspaceFolders){
				var subPath = vscode.workspace.workspaceFolders[i].uri.fsPath;
				if (subPath.indexOf(rootPath) <0 && swgis.swWorkspace.paths.indexOf(subPath)<0) {
					const cB =  new cBrowser.codeBrowser(swgis);
					cB.get_workspaceSymbols(subPath);
				}
			}
		}
    }

    provideWorkspaceSymbols(filter, token) {

		return new Promise((resolve, reject) => {

		
			token.onCancellationRequested(() => reject() );

			this.scanWorkspace(token);
			// --- sift the symbols for 'query'
			const swgis = this.swgis;
			const symbsCache = swgis.swWorkspace.symbs;
			var nodeName, container;
			var dot = filter.indexOf(".");
			var filters = filter.split(".")
			if (filter='') {
				// no filter	
			} else if (filters.length>1) {
				nodeName = filters[1];
				container = filters[0];
			} else if (dot < 1){
				nodeName = filters[0];
			} else {	
				container = filters[0];
			}
			var list = [], total = 0;
				for (var n in symbsCache) {
					if (token && token.isCancellationRequested) reject(e);
					symbsCache[n].forEach(function(symb){
						try {
							if(!symb.name) {
								// ignore
								console.log("--- provideWorkspaceSymbols... symbol.name is null:"+symb);
								console.log(symb);
							} else if(nodeName && symb.name.indexOf(nodeName)<0) {
								// ignore
							} else if (container && symb.containerName && symb.containerName.indexOf(container)<0) {
								// ignore
							} else 
								list.push(symb);
						} catch (err) {
							console.log("--- provideWorkspaceSymbols..."+" -filter: " + filter + " -error: " + err.message);
							console.log(symb);
						}
						total += 1;
					});      
					if (list.length>1000) {
						var tag =  "...limited to "+list.length+" entries, refine filter for more...";
						var symRnge = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(1, 0));
						list.push(new vscode.SymbolInformation(tag, vscode.SymbolKind.Null,symRnge));
						break;
					}		   
				}	
			console.log("--- provideWorkspaceSymbols..."+" -filter: " + filter + " -found: " + list.length+"/"+total);
			return resolve(list);
		});	
	}

    resolveWorkspaceSymbol(symbolInfo, token) {
		console.log("--- resolveWorkspaceSymbol --- " + symbolInfo);
		if(symbolInfo){

		}
    }   

    get_compileCommands(document, range, context, token) {
        let swgis = this.swgis;
        if ( swgis.getActiveSession() == null) return[];

        var fName = document.fileName.split("\\");
        fName = fName[fName.length-1];
        var fPath = document.fileName.split("\\"+fName)[0];
        if (fName=="gis_aliases") return ;
		const commands = [];
        var titleAction = "";//swgis.aliasStanza;
        var p1 = range.start;
        var p2 = range.end;
        var codeBlock = document.lineAt(p1.line).text.split("#")[0].trim(); 
        if (fName=="product.def") {
            var pName = magikParser.get_ProductModuleName(document);
            if (!codeBlock.startsWith(pName)) return;
            codeBlock = "smallworld_product.add_product(\""+fPath+"\")\n";
            titleAction = " Add Product ("+ pName+")";

        } else if (fName=="module.def"){
            var mName = magikParser.get_ProductModuleName(document);
            codeBlock = "_try\n\tsmallworld_product.add_product(\""+fPath+"\\..\")\n\tsw_module_manager.load_module(:"+mName+")\n_when error\n\tsw_module_manager.load_module_definition(\""+fPath+"\")\n\tsw_module_manager.load_module(:"+mName+")\n_endtry";
            titleAction = "Load Module ("+ mName+")";

        } else if (fName=="load_list.txt"){
            codeBlock = "load_file_list(\""+fPath+"\")\n";
            titleAction = "Load File List ("+ fPath+")";

        } else if (fName=="patch_list.txt"){
            codeBlock = "sw!update_image(\""+fPath+"\")\n";
            titleAction = "Load Patch List ("+ fPath+")";

        } else if (range.isEmpty){ //p1.line==p2.line && p1.character==p2.character){
			var foldR = this.find_foldingRange(document,p1);
			if (foldR)  commands.push( { 
				title: "Compile Code: " + foldR.name,	
				command: "swSessions.compileCode", 
				arguments: ["Range",foldR.range],
				tooltip: "Compile code range (F2-r)"});

			if (codeBlock.length>0)  commands.push( { 
				title: "Compile Code Line " + (p1.line+1),	
				command: "swSessions.compileCode", 
				arguments: ['Line',range],
				tooltip: "Compile code line (F2-l)"});

			codeBlock = "Code";
			titleAction = "Compile Code (F2-b)";
						
        } else {
            codeBlock = "Selection";
            p1 = (range.start.line+1) + ":" + (range.start.character+1);
            p2 = (range.end.line+1) + ":" + (range.end.character+1);
            titleAction = "Compile Code Selection "+ p1+ " - "+  p2+ " (F2-s)";
        };
        if (!codeBlock) return [];
        commands.push( {
            title:    titleAction,
            command:  "swSessions.compileCode",
            arguments: [codeBlock,range],
            tooltip: titleAction });
        return commands;    
    }

    find_foldingRange(doc, pos) {
        const swgis = this.swgis ;
        var swWorkspace = swgis.swWorkspace;
        var fName = doc.fileName;
        var i = swWorkspace.index.indexOf(fName);
        var symbols = swWorkspace.symbs[i];
        if (symbols){
            pos = pos.line + pos.character/1000;
            for (var i in symbols){
				var s = symbols[i];
                var range = s.location.range;
                var p1 = range.start.line;//+ range.start.character/1000;
                var p2 = range.end.line; //+ range.end.character/1000;

                if (pos >= p1 && pos <= p2){
                    // p1 = new vscode.Position(range.start.line, 0);
                    // p2 = new vscode.Position(range.end.line+1,0);
					// return new vscode.Range( p1, p2);
					var pname = (s.containerName)? s.containerName+"." : ""
                     return {symbol:s, name: pname + s.name, range: range};
                }
            }
		}	// return new FoldingRange(keyLine, endLine); //, FoldingRangeKind.Region);
    }

    compileCode(context,range,editor,edit){

        let swgis = this.swgis;
        if ( !swgis.getActiveSession() ) return;
        if ( !editor) editor = vscode.window.activeTextEditor;
		if (!range) 
			range = editor.selection;

		var doc = editor.document;
		var codeBlock ;
        switch(context) {
            case 'Error':
				codeBlock = "Compiler error.";
				break;
			case 'Range':
				if (doc.languageId != "magik") return;   
				var pos = range.start;
				var foldR = this.find_foldingRange(doc,pos);
				if (foldR) {
					codeBlock = doc.getText(foldR.range);
					pos = foldR.range.start.line;
					if (pos>0){
						pos = doc.lineAt(pos-1).text.trim();
						if (pos.indexOf("_pragma") == 0 ) codeBlock = pos +"\n"+ codeBlock;
					}
					context = "Code"; 
				} else {
					pos = (range.start.line+1) + ":" + (range.start.character+1);
					pos += " - "+(range.end.line+1) + ":" + (range.end.character+1);
					codeBlock = "failed to find code block range "+pos+".";   
					context = 'Error' ;
				}
				break;
			case 'Line':
				if (doc.languageId != "magik") return;   
				var pos= range.start;
				codeBlock = doc.lineAt(pos.line).text.split("#")[0].trim(); 
               if (codeBlock.length==0) {
                    codeBlock = "failed to find code at line "+(pos.line+1)+".";   
					context = 'Error' ;
				}
                break;
            case 'Code':
                if (doc.languageId != "magik") return;   
                codeBlock = doc.getText();
                break;
            case 'Selection':
				codeBlock = doc.getText(range).trim();
                if (range.isEmpty || codeBlock.length==0){
					pos = (range.start.line+1) + ":" + (range.start.character+1);
					pos += " - "+(range.end.line+1) + ":" + (range.end.character+1);
                    codeBlock = "failed to find code selection "+pos+".";    
                    context = 'Error' ;
				} 
                break;
             default: 
                codeBlock = context;
                context = null;
        }
        if (codeBlock.trim().length==0){
            codeBlock = "failed to find code in block range.";    
            context = 'Error' ;
		}
		// codeBlock = codeBlock.replace(/[\r]/g,'');
        swgis.sessions.sendCode(codeBlock,context,doc.fileName);
    }
    
    aproposCode(context,editor,edit){
        
        let swgis = this.swgis;
        if ( !swgis.getActiveSession() ) return;
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
		var mode = 'Line'
        if (!context) {
            context = "failed to compile Magik code.";
            mode = 'Error'
		}
        swgis.sessions.sendCode(context,mode);
	}

	provideSignatureHelp(document, position, token) {
        // if (!this.swConfig) {
        //     this.swConfig = vscode.workspace.getConfiguration('magik', document.uri);
        // }
        // let theCall = this.walkBackwardsToBeginningOfCall(document, position);
        // if (theCall == null) {
        //     return Promise.resolve(null);
        // }
        // let callerPos = this.previousTokenPosition(document, theCall.openParen);
        // // Temporary fix to fall back to godoc if guru is the set docsTool
        // let swConfig = this.swConfig;
        // if (swConfig['docsTool'] === 'guru') {
        //     swConfig = Object.assign({}, swConfig, { 'docsTool': 'godoc' });
        // }
        // return goDeclaration_1.definitionLocation(document, callerPos, swConfig, true, token).then(res => {
        //     if (!res) {
        //         // The definition was not found
        //         return null;
        //     }
        //     if (res.line === callerPos.line) {
        //         // This must be a function definition
        //         return null;
        //     }
        //     let declarationText = (res.declarationlines || []).join(' ').trim();
        //     if (!declarationText) {
        //         return null;
		//     }
		
        //     let result = new vscode.SignatureHelp();
        //     let sig = symb.type + ' ' + symb.parent + ' ' + symb.name;
        //     let si = new vscode.SignatureInformation(sig, res.doc);
	    //         si.parameters = symb.params.map(paramText => new vscode.ParameterInformation(paramText));
        //     result.signatures = [si];
        //     result.activeSignature = 0;
        //     result.activeParameter = Math.min(theCall.commas.length, si.parameters.length - 1);
        //     return result;
        // }, () => {
        //     return null;
        // });
    }

}
exports.codeExplorer = codeExplorer;
