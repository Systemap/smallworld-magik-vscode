// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require("vscode");
const fs=require("fs");
const os=require("os");
const codeBrowser = require('./codeBrowser');
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
		this.codeBrowser =	new codeBrowser.codeBrowser(swgis);
		// ---- gisAliases
		this.gAliases = new gAliases.gisAliases(swgis);
    }

    run(context) {
		const cB = this.codeBrowser;
        vscode.workspace.onDidChangeWorkspaceFolders(event => {
			if (!event) return;
			event.added.forEach(function(val,idx,arr){
				var fPath = val.uri.fileName;
				cB.scanWorkspace(fPath);
			});	
			event.removed.forEach(function(val,idx,arr){
				var fName = val.uri.fileName;
				swWorkspace.tagIndex[fName] = null;
			});	
		}, null, context.subscriptions);

		// const swgis = this.swgis;
		// var rootPath = vscode.workspace.rootPath;
		// if (rootPath && swgis.swWorkspace.paths.indexOf(rootPath)<0) {
		// 		const cB =  new cBrowser.codeBrowser(swgis);
		// 		cB.scanWorkspace(rootPath);
		// }	
	}

    provideHover(document, position, token) {
		let fName = document.fileName;
		if (fName.endsWith("gis_aliases"))
			return this.gAliases.provideHover(document, position, token);   
		else if (fName.endsWith("environment.bat"))
			return;
	
        var commands = this.get_aproposCommands(document, position)
        if (!commands) return;

		const contents = new vscode.MarkdownString();
        // for (var i in commands ){
        //     var cmd = commands[i];
        //     const args = encodeURIComponent(JSON.stringify( [cmd]))
        //     const commandUri = vscode.Uri.parse(`command:swSessions.apropos?${args}`);
        //     if (i >0) contents.appendMarkdown(`  ${"\n"}`);
        //     contents.appendMarkdown(` [${cmd}](${commandUri})`,"magik");
        // }
        // contents.isTrusted = true;
        // return new vscode.Hover(contents);

        for (var i in commands ){
            var cmd = commands[i];
            if (i > 0) contents.appendMarkdown(`  ${"\n"}`);
            contents.appendMarkdown(cmd,"magik");
        }
        contents.isTrusted = true;
        return new vscode.Hover(contents);
    }

    get_aproposCommands(document, pos) {

        const swgis = this.swgis;
        if ( !swgis.getActiveSession() ) return;

		var codeWord = this.getClassMethodAtPosition(document, pos);
		if (!codeWord) return;
		var commands = [],cmd,arg,lbl;
		if ( document.languageId=="swCB"){
			lbl =   "Jump to source: "+codeWord;
			arg = encodeURIComponent(JSON.stringify([document,codeWord]));
			cmd = vscode.Uri.parse(`command:swCb.jump?${arg}`);
			commands.push(` [${lbl}](${cmd})`)
		} else {
			lbl =   "Class Browser: ";
			arg = encodeURIComponent(JSON.stringify([codeWord]));
			cmd = vscode.Uri.parse(`command:swCb.find?${arg}`);
			commands.push(` [${lbl+codeWord}](${cmd})`)
		}
        return commands;
    }
    
    provideReferences(document, position, options, token) {
        const swgis = this.swgis;
        return new Promise((resolve, reject) => {

            token.onCancellationRequested(() => reject() );

            // get current word
			var codeWord = magikParser.getSymbolNameAtPosition(document, position);
            if (!codeWord) 
			    codeWord = magikParser.getEnvironVarAtPosition(document, position);
            if (!codeWord) 
                return resolve([]);

			this.scanWorkspace('provideReferences',token);			
			var filter = codeWord.toLowerCase();
			// var exm = codeWord[0].toLowerCase();
			// var searchExp = "." + mtd;
			// var codeText = document.getText();
			// var codeUri = document.uri;
            try {
                let results = swgis.filterWorkspaceRefs(filter);
                resolve(results);
            }
            catch (e) {
				reject(e);
            }
        });
    }
	
	getClassMethodAtPosition(document, pos){
		if ( document.languageId=="swCB"){
			var nameStr = document.lineAt(pos.line).text.split("#")[0].trim(); 
			if (/\s+IN\s+/.test(nameStr)) {
				var str = nameStr.split(/\s+/g);
				if (str.length > 3){
					return  str[2]+str[0];    
				}
			} else if (/[\w!?]*:?[\w!?]+\s+\.[\w!?\(\)\[\]]+\s+_pragma/i.test(nameStr)) {
				var str = nameStr.split(/[\.\s]+/g);
				if (str.length > 2){
					return  str[0]+'.'+str[1];    		
				}
			}	
			return;
		}	
		var filter = magikParser.getSymbolNameAtPosition(document, pos);
		if (!filter) return;

        var editor = vscode.window.activeTextEditor;
		if (editor) {
			var range = editor.selection
			if (!range.isEmpty && range.isSingleLine) {
				let s = range.start, e = range.end;
				if (pos.line==s.line && pos.character>=s.character && pos.character<=e.character)
					return document.getText(editor.selection).replace(/\s*/g,'');
			}
		}

		var className = null;
		var methodName = null;
		var ClassMethod = magikParser.getClassMethodAtPosition(document, pos);
		if (ClassMethod) {
			className = ClassMethod[0];
			methodName = ClassMethod[1];
			if (className ==  "_super" || className ==  "_self"){
				var foldR = this.find_foldingRange(document,pos);
				if (foldR){
					className = foldR.symbol.containerName;
					if (!className) className =  "";					
				}
			} else if (!className.length && filter.indexOf(className)<0) {
				className = '';
			}

			if (methodName.search(magikParser.keyPattern.pseudo_defs)==0) {
				var foldR = this.find_foldingRange(document,pos);
				if (foldR) {
					methodName = foldR.symbol.name;
				}	
			}
			if (filter==className) 
				filter = className + ".";
			else if (methodName.indexOf(filter)==0)
				filter = "." + methodName;
			else 
				filter = className + "." + methodName;
		}
		return filter;
	}	

	provideDefinition(document, pos, token){
		var filter = this.getClassMethodAtPosition(document, pos);
		if (!filter) return 

		let swgis = this.swgis;
		if(document.languageId=="swCB") {
			return //this.get_aproposCommands(document, pos)
		} else {
			var symbols = swgis.filterWorkspaceSymbs(filter);
			if (symbols.length==0){
				this.scanWorkspace('provideDefinition',token);			
				symbols = this.swgis.filterWorkspaceSymbs(filter);
			}
			for (var i in symbols){
				symbols[i] = symbols[i].location 
			  }

			return symbols;
		}	
	}	

    provideCodeActions(document, range, diagnostics, token) {
		let fName = document.fileName;
		if (fName.endsWith("gis_aliases"))
			return this.gAliases.provideCodeActions(document, range, diagnostics, token);   
		else if (fName.endsWith("environment.bat"))
			return;
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

    scanWorkspace(caller,token, rootPath) {

		const swgis = this.swgis;
		const cB = this.codeBrowser;
		var scanFolders = []
		if(rootPath){
			scanFolders.push(rootPath)
		} else {
			var workspaceFolders = vscode.workspace.workspaceFolders
			for(var i in workspaceFolders) {
				scanFolders.push(workspaceFolders[i].uri.fsPath);
			}			
		}
        if (scanFolders.isEmpty) {
            vscode.window.showInformationMessage('Add Smallworld product folders to Workspace to explore Magik Symbols.');
            return;
		} else 
			console.log(caller +  " scanWorkspace "+scanFolders.toString());

		var pathIndex;
		if (caller=='provideReferences') {
			pathIndex = swgis.swWorkspace.refIndex;
			for(var i in scanFolders){
				var subPath = scanFolders[i];
				if (!pathIndex[subPath])
					cB.scanWorkspace(subPath,caller,token);
			}		
		} else { 
			pathIndex = swgis.swWorkspace.paths;
			for(var i in scanFolders){
				var subPath = scanFolders[i];
				if ( pathIndex.indexOf(subPath)<0 )
					cB.scanWorkspace(subPath,caller,token);
			}		
		}
    }

    provideWorkspaceSymbols(filter, token) {

		return new Promise((resolve, reject) => {
			token.onCancellationRequested(() => reject() );

			this.scanWorkspace('provideWorkspaceSymbols',token);
			// --- sift the symbols for 'query'
			const swgis = this.swgis;
			const symbsCache = swgis.swWorkspace.tagIndex;
			var nodeName, container,nodePack;
			var dot = filter.indexOf(".");
			if (filter.indexOf(":")>-1){
				filter = filter.split(":");
				nodePack =  filter[0].toLowerCase();
				filter = filter[1];
			} else nodePack = '';
			var filters = filter.split(".");
			if (!filter) {
				// return; // no filter	
			} else if (filters.length>1) {
				nodeName = filters[1];
				container = filters[0];
			} else if (dot < 1){
				nodeName = filters[0];
				container = '';
			} else {	
				nodeName = '';
				container = filters[0];
			}
			console.log(filter+ '| -node:|'+nodeName+ '| -container:|'+container+'| -nodePack:|'+ nodePack);
			var list = [], total = 0;
				for (var n in symbsCache) {
					if (token && token.isCancellationRequested) reject(e);
					symbsCache[n].forEach(function(symb){
						try {
							if(!symb.name) {
								// ignore
								console.log("--- provideWorkspaceSymbols... symbol.name is null:"+symb);
								console.log(symb);
								return;
							}
							if(nodeName && symb.name.indexOf(nodeName)<0) {
								return; // ignore
							}		
							if (container){
								if (!symb.containerName || symb.containerName.indexOf(container)<0) 
								return; // ignore
							}
							if (nodePack){
								if (!symb.package || nodePack != symb.package ) 
								return; // ignore
							}
							list.push(symb);
							// console.log(filter+ '| - |'+nodeName+ '| - |'+symb.name+'| - |'+container+'| - |'+ symb.containerName);
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
        var titleAction = "";
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
            codeBlock = "_try\n\tsmallworld_product.add_product(\""+fPath+"\\..\\..\")\n\tsw_module_manager.load_module(:"+mName+")\n_when error\n\tsw_module_manager.load_module_definition(\""+fPath+"\")\n\tsw_module_manager.load_module(:"+mName+")\n_endtry";
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
        // const swgis = this.swgis ;
        // var swWorkspace = swgis.swWorkspace;
        // var fName = doc.fileName;
		// var symbols = swWorkspace.tagIndex[fName];
		const cB = this.codeBrowser;
		var codeBlock = doc.getText();
		var symbols = cB.get_codeSymbols(codeBlock,doc.uri, doc.languageId);
		console.log("find_foldingRange: "+pos.line);
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
						if (pos.indexOf("_pragma") == 0 ) {
							codeBlock = pos +"\n"+ codeBlock;
							pos=pos-1;
						}
						codeBlock = '\n'.repeat(pos) + codeBlock;
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
				codeBlock = doc.getText(range);
                if (range.isEmpty || codeBlock.trim().length==0){
					pos = (range.start.line+1) + ":" + (range.start.character+1);
					pos += " - "+(range.end.line+1) + ":" + (range.end.character+1);
                    codeBlock = "failed to find code selection "+pos+".";    
                    context = 'Error' ;
				} else {
					codeBlock = '\n'.repeat(range.start.line) + codeBlock;
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
        if (!this.swConfig) {
            this.swConfig = vscode.workspace.getConfiguration('magik', document.uri);
        }
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
