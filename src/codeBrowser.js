// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------
'use strict';
const vscode = require('vscode');
const fs=require("fs");
const magikParser = require('./magikParser');

class codeBrowser{
    constructor(swgis) {
        this.swWorkspace = swgis.swWorkspace;
        this.swgis = swgis;
    };
        
    provideDocumentSymbols(document, token) {
		var codeUri = document.uri;
		var codeBlock = document.getText();
		var languageId =  document.languageId;
		if (document.languageId=="swCB")	return; 
		
		this.get_codeReferences(codeBlock, codeUri, languageId, token);
		return this.get_codeSymbols(codeBlock,codeUri, languageId,  token);
    };
        
    get_fileSymbols(fileName) {
		var data = fs.readFileSync(fileName);
		var codeBlock = data.toString();
		var codeUri =  vscode.Uri.file(fileName);
		return this.get_codeSymbols(codeBlock, codeUri);
    }
        
    get_fileReferences(fileName) {
		var data = fs.readFileSync(fileName);
		var codeBlock = data.toString();
		var codeUri =  vscode.Uri.file(fileName);
		return this.get_codeReferences(codeBlock, codeUri);
    }
        
    get_codeSymbols(codeBlock, codeUri,languageId, token) {
		var fileName = codeUri.fsPath.toLowerCase();
        var symInfos;
        if(languageId=="magik" || fileName.endsWith(".magik")) {
            symInfos = this.get_magikSymbols(codeBlock, codeUri, token); 
        } else if(fileName.endsWith("\module.def")) {
            symInfos = this.get_moduleSymbols(codeBlock, codeUri, token);
        } else if(fileName.endsWith("\product.def")) {
            symInfos = this.get_productSymbols(codeBlock, codeUri, token);
        } else if (fileName.endsWith("\gis_aliases")) {
            symInfos = this.get_gisSymbols(codeBlock, codeUri, token);
        } else if (fileName.endsWith("\environment.bat")) {
            symInfos = this.get_gisSymbols(codeBlock, codeUri, token);
		} else if(languageId=="swgis" || fileName.endsWith(".msg")) {
            symInfos = this.get_messageSymbols(codeBlock, codeUri, token); 
        } else {
            return [];
        }
        this.swWorkspace.tagIndex[fileName] = symInfos;  

		return  symInfos;   
    };

    get_codeReferences(codeBlock, codeUri,languageId, token) {
		var fileName = codeUri.fsPath.toLowerCase();
        var refInfos = [];
        if(languageId=="magik" || fileName.endsWith(".magik")) {
            refInfos = this.get_magikReferences(codeBlock, codeUri, token); 
        // } else if(fileName.endsWith("\product.def")) {
        //     refInfos = this.get_productReferences(codeBlock, codeUri, token);
        // } else if (fileName.endsWith("\gis_aliases")) {
        //     refInfos = this.get_aliasesReferences(codeBlock, codeUri, token);
        // } else if (fileName.endsWith("\environment.bat")) {
        //     refInfos = this.get_environReferences(codeBlock, codeUri, token);
		} else if(languageId=="swgis" || fileName.endsWith(".msg")) {
            refInfos = this.get_messageReferences(codeBlock, codeUri, token); 
        } else if(fileName.endsWith("\module.def")) {
            refInfos = this.get_moduleReferences(codeBlock, codeUri, token);
        } else {
            return [];
        }
        const swWorkspace = this.swWorkspace;
        swWorkspace.refIndex[fileName] = refInfos;         
        return  refInfos;   
    };

    scanWorkspace(rootPath,caller,token) {
		if (!rootPath) {
			var aTextEditor = vscode.window.activeTextEditor;
	        if (aTextEditor)
				rootPath = vscode.workspace.getWorkspaceFolder(aTextEditor.document.uri).uri.fsPath;
			else 
				return;	
		}	
      
		rootPath = rootPath.replace(/\//g,"\\");
		const ignorePattern = [".git",".vscode"];
		const includePattern = [".magik",".msg","\module.def","\product.def","\gis_aliases","\environment.bat"];
        const swgis = this.swgis;
        const swWorkspace = swgis.swWorkspace;
        const isFileSignature = function(fName, fSignatures) {
			for(var f in fSignatures)
				if(fName.endsWith(fSignatures[f])) return true;
		}

		const grab = function(dir,pathIndex,codeScanner) {
			if ( isFileSignature(dir,ignorePattern) ) return 0;
			var fileList = fs.readdirSync(dir) 
			var count = fileList.length;
			for(var i in fileList){
				var stat = null, file = dir + '\\' + fileList[i];
			try {
					stat = fs.statSync(file);
			} catch(err) {
					// igonre
		}
				if (!stat || isFileSignature(file,ignorePattern) ) {
					// ignore
				} else if (stat.isDirectory()) {
					count += grab(file,pathIndex,codeScanner);
				} else if(!pathIndex[file] && isFileSignature(file,includePattern)) {    
					try{   
					 let data = codeScanner(file);
					 pathIndex[file] = data;
					} catch(err) {
						console.log("--- scanWorkspace:  Error: "+err.message+" - "+file);		
					}   
                }	
			}
			return count;
		}         
	
		const walk = async function(rootPath,pathIndex, codeScanner){
			try {
				if (pathIndex[rootPath]) return;
				var d1 = new Date();
				var count = await grab(rootPath,pathIndex,codeScanner);
				pathIndex[rootPath] = [];
				var t = Math.round((new Date().getTime()-d1.getTime())/1000);
				vscode.window.showInformationMessage("Scanning Workspace took: "+t+"s - files: "+count+" - "+rootPath);
				console.log("--- scanWorkspace: -Count: "+count+" -Time: "+t+"s - "+rootPath);		
			} catch(err) {
				pathIndex[rootPath] = null; 
				vscode.window.showInformationMessage("Scanning Workspace Failed "+err.message+" "+rootPath);
				console.log("--- scanWorkspace:  Error: "+err.message+" - "+rootPath);		
			}   
		}

		var pathIndex, codeScanner, eng = this;
		if (!caller || caller=='provideReferences') {
			pathIndex = swWorkspace.refIndex;
			codeScanner = function(fname){ return eng.get_fileReferences(fname);}
            walk(rootPath,pathIndex,codeScanner);    
		}
		if (!caller || caller!='provideReferences') {
			pathIndex = swWorkspace.tagIndex;
			codeScanner = function(fname){ return eng.get_fileSymbols(fname);}
            walk(rootPath,pathIndex,codeScanner);    
		}

        return pathIndex; 
    }
    
    symbolLocation(filter,filename) {
		const swgis = this.swgis;
        const swWorkspace = swgis.swWorkspace;
		let pathIndex = swWorkspace.tagIndex;
		if(!pathIndex[file] && isFileSignature(file,includePattern))    
		try{   
			 let data = eng.get_fileSymbols(filename);
			 pathIndex[file] = data;
		} catch(err) {
			console.log("--- scanWorkspace:  Error: "+err.message+" - "+file);		
		}   
	};

    get_productSymbols(codeBlock, codeUri, token) {
		var symInfos = [];
		var codeLines = codeBlock.split("\n");
		
		for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
			var lineText = codeLines[lineCount].split("#")[0].trim();
			var tag = lineText.split(/\s/)[0];
			if ( tag.length == 0) continue;
			var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0));
			var symInfo = new vscode.SymbolInformation(tag, vscode.SymbolKind.Package, symRnge,codeUri);
			symInfos.push(symInfo);
			break;
		}

	    return symInfos  
    }

    get_moduleReferences(codeBlock, codeUri, token) {
		const refIndex = {};
		var codeLines = codeBlock.split("\n");
		var requires=false, name=true;
		// parse the document for Symbols
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
			var lineText = codeLines[lineCount].split("#")[0].trim();
			var tag = lineText.split(/\s/)[0];
			if ( tag.length == 0) {
				continue;
			} else if (tag.search(/requires/i)==0){
				requires = true;
			} else if (requires || name){
				tag = tag.toLowerCase();
				var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0));
				if (!refIndex[tag]) refIndex[tag] = [];
				refIndex[tag].push( new vscode.Location(codeUri, symRnge));
				name = false;
			}
		};
        return refIndex;
	}

    get_moduleSymbols(codeBlock, codeUri, token) {
		var symInfos = [];
		var codeLines = codeBlock.split("\n");
		
		for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
			var lineText = codeLines[lineCount].split("#")[0].trim();
			var tag = lineText.split(/\s/)[0];
			if ( tag.length == 0) continue;
			var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0));
			var symInfo = new vscode.SymbolInformation(tag, vscode.SymbolKind.Module, symRnge,codeUri);
			symInfos.push(symInfo);
			break;
		};

	    return symInfos;  
    }

    get_magikReferences(codeBlock, codeUri, token) {
        const parserKeys = magikParser.keyPattern;
        const class_dot_bare_method = parserKeys.class_dot_bare_method;
        const pseudo_defs = parserKeys.pseudo_defs;
		const objectsToIgnore = /\b(_self|_super)\b/i;
        const refIndex = {};
		const pushRef = function(tag,lineIndex,charIndex){
			let pos = new vscode.Position(lineIndex,charIndex);
			tag = tag.trim().toLowerCase();
			if (!refIndex[tag]) refIndex[tag] = [];
			refIndex[tag].push( new vscode.Location(codeUri, pos));
		};
		var codeLines = codeBlock.split("\n");
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
            var codeLine = codeLines[lineCount].split('#')[0];
			let match;
            while (match = class_dot_bare_method.exec(codeLine)) {
				// codeLine = magikParser.maskStringComments( codeLine );
				// if (magikParser.testInString(codeLine,match.index,true)) continue;
				let ref = match[0].split(".");
				// if (pseudo_defs.test(ref[1])) continue;
				// let def = new RegExp('_method\\s+'+ref[0],'i') ;
				// if (def.test(codeLine)) continue;
				pushRef(ref[1],lineCount,match.index + match[0].length - ref[1].length);
				// if (objectsToIgnore.test(ref[0])) continue;
				// pushRef(ref[0],lineCount,match.index);
			}
        }
        return refIndex;
    }

    get_magikSymbols(codeBlock, codeUri, token){
        var symRef = [];
        var symRefIndex = [];
		var lastContainer = null;  
		var codeLines = codeBlock.split("\n");
		var vsSymbols = this.parse_magikSyntax(codeLines,codeUri);
		const convertTagToSymbol = function(tag,k,vsSymbols){
			// var tag = vsSymbols[k]
			var parentName = tag.containerName;   
			if (parentName == null) {
				if (symRef.indexOf(tag.nodeName) <0) {
					symRef.push(tag.nodeName);
					// symRefIndex.push( [tag.nodeName, tag.vsKind, tag.keyPosition, tag.endPosition] );
				};
				// continue;
			} else if (lastContainer==null || lastContainer[0]!=parentName){//( (i=symRef.indexOf(parentName)) < 0) {
				var p1 = tag.keyPosition;
				var i = Math.max(0,p1.line-1);
				p1 = new vscode.Position( i,0 );
				var tagRef = [parentName,vscode.SymbolKind.Class,p1,tag.endPosition,parentName,tag.package];// + " " + i];
				//   symRef.push(parentName);
					symRefIndex.push(tagRef);
					tag.parentNode = tagRef;
					lastContainer = tagRef;
					tag.parentNode = lastContainer;
					parentName = lastContainer[4]; 
			} else {
				// symRefIndex[i][3] = tag.endPosition;  
				lastContainer[3] = tag.endPosition; 
				tag.parentNode = lastContainer;
				parentName = lastContainer[4]; 
			};
			var symRnge = new vscode.Range(tag.keyPosition, tag.endPosition);
			// var symInfo = new vscode.SymbolInformation(tag.nodeName, tag.vsKind, symRnge, fileName, parentName);
			var label = (tag.nodeName)? tag.nodeName : "_unset"; //+ " " + tag.keyPosition.line;
			var symInfo = new vscode.SymbolInformation(label, tag.vsKind, symRnge, codeUri, parentName);
			symInfo.package = tag.package;
			return symInfo;
		}

		for(var k in vsSymbols){
			var tag = vsSymbols[k];
			try {
				var symInfo = convertTagToSymbol(tag,k,vsSymbols);
				vsSymbols[k] = symInfo;
			} catch(err) {
				console.log("---get_magikSymbols("+tag.containerName+"-"+ tag.nodeName+") Error("+err.message+"): "+codeUri.fileName);
			}   
        };
 
        for(var k in symRefIndex){
            var tagRef = symRefIndex[k]
			if (!tagRef[4]) continue;
			var symRefInfo = new vscode.SymbolInformation(tagRef[4], tagRef[1], new vscode.Range(tagRef[2],tagRef[3]),codeUri );
			symRefInfo.package = tagRef[5];
            vsSymbols.push(symRefInfo); 
        };
        
		// console.log("---get_magikSymbols("+vsSymbols.length+") Done: "+codeUri.fsPath);
        return vsSymbols;
    };

    get_gisSymbols(codeBlock, codeUri, token){
		var symInfos = [];
		var codeLines = codeBlock.split("\n");
		
        // parse the document for Symbols
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
            var lineText = codeLines[lineCount];
            var tag = magikParser.getTagText(lineText,":");
            if (!tag) continue;
			if ((tag=tag.trim()).search(":") != tag.length-1) continue;
			tag = tag.split(":")[0];
            if (tag.indexOf(" ")>-1) continue;
            var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0))
            var symInfo = new vscode.SymbolInformation(tag, vscode.SymbolKind.Interface, symRnge, codeUri);
            symInfos.push(symInfo);
        };
        return symInfos;
    };
              
    get_messageReferences(codeBlock, codeUri, token) {
		const refIndex = {};
		var codeLines = codeBlock.split("\n");
		// parse the document for Symbols
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
            var msg = codeLines[lineCount].match(/\s*:[\w!?]+\s+/);
			if (msg && msg.index == 0) {
				msg = msg[0].slice(1).trim().toLowerCase();
				var symRnge = new vscode.Range(new vscode.Position(lineCount, 0), new vscode.Position(lineCount+1, 0));
				if (!refIndex[msg]) refIndex[msg] = [];
				refIndex[msg].push( new vscode.Location(codeUri, symRnge));
			}
		};
        return refIndex;
    };
              
    get_messageSymbols(codeBlock, codeUri, token){
		
		const swWorkspace = this.swWorkspace;
      	var refInfos =  swWorkspace.refIndex[codeUri.fileName];         
		if (!refInfos || refInfos.length==0)
			refInfos = this.get_messageReferences(codeBlock, codeUri, token);
		
			var parentNode = codeUri.fsPath.split(/[\\//]/g);
			parentNode = parentNode[parentNode.length-1].split('.')[0];
			var symInfos = [], symInfo, symRnge;	
        for (var msg in refInfos) {
			symRnge = refInfos[msg][0];
			symInfo = new vscode.SymbolInformation(msg, vscode.SymbolKind.EnumMember, parentNode, symRnge);
			symInfos.push(symInfo);
		}; 

		symRnge = new vscode.Range(new vscode.Position(0, 0), symRnge.range.end);
		symInfo = new vscode.SymbolInformation(parentNode, vscode.SymbolKind.Enum, symRnge, codeUri);
		symInfos.push(symInfo);

        return symInfos;
    };
              
    parse_magikSyntax(codeLines,codeUri) {
		var tags = [], codeLinesTags, swPackage ='';
		var nestedCodeOutline = vscode.workspace.getConfiguration('Smallworld').get("nestedCodeOutline");
		let match, keys = magikParser.magikKeys(); 
		var blockCode = 0;
		// parse the document for symbols
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
			var codeLine = codeLines[lineCount];
			try {

				if (/_package/i.test(codeLine)) {
					swPackage = codeLine.replace(/_package\s+/i,'').replace(/\s+/i,'').split(/\W/)[0].toLowerCase();
					continue;
				}
				var tagFootprint=0;
				while ((match = keys.regexp.exec(codeLine)) !== null) {
					var keyPos = match.index;
					if (keyPos < tagFootprint) continue;
					tagFootprint = keyPos;

					if (magikParser.isntActiveCode(codeLine,keyPos)) continue;
					if (/_global/i.test(match[1])) {
						if (/_global\s+_constant/i.test(codeLine)) continue;
						else if (/(_global\s+_constant\s+_proc[@\s\(|_global\s+_proc[@\s\(])/i.test(codeLine))	continue;
					// } else if (/(_proc|_block)/i.test(tagKey)) {
					// 	var arr = magikParser.splitChevron(tagTxt);
					// 	if (!arr && tag.keyPosition.line > 0){
					// 		for(var i = tag.keyPosition.line-1;i>=0;i--){
					// 			var lastline = magikParser.maskStringComments(codeLines[i]).trim();
					// 			if (lastline.length==0)	continue;
					// 			if (/\.*<<\s*\(*(_allresults)*/i.test(lastline)){
					// 				tagTxt = lastline + tagTxt;
					// 				break;	
					// 			} else if (/\S/.test(lastline))	
					// 				break;	
					// 		}
					// 		arr = magikParser.splitChevron(tagTxt);
					// 	} ;   
					}
					var tag = this.parse_magikTag(match,codeLines,keyPos,lineCount,swPackage);
					this.set_nodeContainerNames(tag);
					tags.push(tag);
					
					if( tag.key=='_block' && blockCode<lineCount) 
						blockCode = (tag.endPosition)? tag.endPosition.line : 0;
					if (!nestedCodeOutline && lineCount > blockCode) 
						lineCount = (tag.endPosition)? tag.endPosition.line : lineCount;
				}		
			} catch(err) {
				console.log("---parse_magikSyntax Error: "+err.message+" - Line("+lineCount+"): "+codeLine+" - "+codeUri.fsPath);
			}
        }  
        return tags;  
    }
           
    set_nodeContainerNames(tag) {
		// build node and container names    
		var root, node, args;
		var tagTxt = tag.text;
		switch (tag.keyWord) {
			case '_method':
			// case '_private_method':
			// case '_abstract_method':
			// case '_iter_method':
				let match = magikParser.keyPattern.class_dot_method.exec(tag.text)
				if (match) match = match[0];
				else  match = tag.text;
				match = match.split(".");
				root = match[0];
				node =  magikParser.proofMethodName(match[match.length-1]);
				args = "";
				break; 
			case '_proc':
			// case '_iter_proc':
				node = tagTxt.match(/_handling\s+[\w!?]+\s+_with\s*/i);
				if (node && node.length) node = node[0].split(/\.*_handling\s+/i)[0];
				else if(node = magikParser.splitChevron(tagTxt)) node = node[0]; 
				else node = null;
				args ='()'
			case '_block':
				root = null;//tag.keyWord;
				if (!node) {
					node = tagTxt.match(/@[\w!?]+/);
					if (node && node.length){
						node = node[0];
					} else {
						node = "@unnamed";
					}
				}		
				node = tag.keyWord +" "+ node;
				args = (args)? args:"";
				break;    
			case '_dynamic_import':
			case '_dynamic':
			case '_global_constant':
			case '_global':
			case '_constant':
				root =  null;//tag.keyWord;
				node = tag.keyWord+ " ";
				var arr = magikParser.splitChevron(tagTxt);
				if (arr) args = arr[0];
				else args = tagTxt.replace(magikParser.keyPattern[tag.key],'');
				args = args.trim();
				break;    
			case 'def_mixin':
			case 'def_slotted_exemplar':
				root =  magikParser.param0(tag);
				node = tag.keyWord;
				args = "";
				break;                       
			case 'condition':
			case 'magik_session':
			case 'application':
				root = tag.keyWord;               
				node = magikParser.param0(tag);
				args = "";
				break;    
			case 'define_property':
			case 'define_slot_access':
			case 'define_pseudo_slot':
			case 'def_property':
			case 'define_shared_variable':
			case 'define_shared_constant':
				root = tagTxt.split(".")[0].trim();
				node = magikParser.param0(tag);
				if (!node) node = tag.text;
				args = "";
				break;
			case 'sw_patch_software':
				root = null;
				node = tagTxt.trim();
				args = "";                 
				break;    
			default:
				root = tagTxt.split(".")[0].trim();
				node = tag.text.split(/[\(\[]*/);
				node = node[1].split(',')[0];
				args = "";
		}	
		if (root)  root = root.replace(/[\"\':]/g,'');
		if (node)  node = node.replace(/[\"\':]/g,'');

		tag.containerName = root;
		tag.nodeName = node+args;    
    }

    parse_magikTag(match,code,keyPos,keyLine,swPackage) {
			var tagKey = match[1].toLowerCase().replace(/(.+\.|\s)/g,'');
			var mSymb = magikParser.magikSymbols[tagKey];
            var tagRange = this.parse_foldingRange(code, keyLine, keyPos, mSymb[0], mSymb[1]) 
			var tagParams = "";
            var syntaxText ="", pCount =0;
            for (var i=keyLine; i <= tagRange.end.line; ++i) {
                syntaxText +=  magikParser.trimComments(code[i]) ;
				var maskedSyntaxCode =  magikParser.maskStringComments(code[i]) ;
				if (/\$/.test(maskedSyntaxCode)) break;
				var p1 = maskedSyntaxCode.match(/\(/g); 
				var p2 = maskedSyntaxCode.match(/\)/g);
				pCount += ((p1)? p1.length : 0) - ((p2)? p2.length : 0);
				if (pCount == 0) {
                    // if (tagKey[0]=='_') keyPos+=1;
					
					// let compound_index =  mSymb[0].exec(syntaxText);
					// if (compound_index)	{
					// 	keyPos = keyPos+compound_index[0].length;
					// 	// console.log(syntaxText)
					// } else{
					// 	keyPos = keyPos+tagKey.length;
					// }
					keyPos = keyPos + match[1].length;
		
                    syntaxText = magikParser.getSyntaxCode(syntaxText,keyPos,mSymb[1],mSymb[2]);

                    p1 = syntaxText.indexOf('(');
                    p2 = syntaxText.lastIndexOf(')')+1;
                    if (p1 > -1 && p2 > p1) {
                        tagParams = syntaxText.slice(p1,p2);
                    }
					break;
				}
            };

            var tag = {
                text:        syntaxText, 
                key:         tagKey,
                range:       tagRange,
                keyWord:     mSymb[4], 
                endWord:     mSymb[1], 
                keyPosition: tagRange.start,
                endPosition: tagRange.end,
                parentNode:  null,
                containerName: null,
                nodeName:    null,   
				params :     tagParams,
				package:	 swPackage,
                vsKind:      mSymb[3] 
            };
        return tag;
    }           

    parse_foldingRange(code, keyLine, keyPos,keyWord,endWord) {
            // folding range    
            var nestedBrackets = 0;
            let closeBracket = /\)/g;
            let openBracket = /\(/g;
            if (endWord!=')'){
                closeBracket = new RegExp(  "\\b("+ endWord + ")\\b","ig"); 
                openBracket =  new RegExp( "\\b("+ keyWord + ")\\b" ,"ig"); 
            } ;
			var endLine = keyLine, endPos = 0, lastLine = ""; 
			var doc_length =  code.length;
			//if(false){
            for (; endLine< doc_length; ++endLine) {
                lastLine = magikParser.maskStringComments(code[endLine]);
				if (/\$/.test(lastLine)) break;
				var p1 = lastLine.match(openBracket); 
				var p2 = lastLine.match(closeBracket);
				nestedBrackets += ((p1)? p1.length : 0) - ((p2)? p2.length : 0);
				if (nestedBrackets == 0) break;
			}; 

		const parserKeys = magikParser.keyPattern;
		let prefixes = /\b(_iter|_abstract|_private)\b/i;
        if(parserKeys.pseudo_defs.test(keyWord))
			prefixes = /[a-z_!?][\w!?]*\s*\./i;
		for(var n = keyLine; n>=0; --n){
				let match = prefixes.exec(code[n]);
				if (match){
					keyLine = n;
					keyPos = match.index;
					if (match[0]=="_pragma") break; 
				}
				if (n < keyLine && code[n].length>0) break;
		}

		keyPos = new vscode.Position(keyLine,keyPos);
		endPos = Math.max(0, lastLine.lastIndexOf(endWord) + endWord.length);
		endPos = new vscode.Position(endLine,endPos);
		var tagRnge = new vscode.Range(keyPos, endPos);

        return tagRnge   
    }
}
exports.codeBrowser = codeBrowser    

