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
		return this.get_codeSymbols(codeBlock,codeUri, document.languageId,  token);
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
		var fileName = codeUri.fsPath;
        var symInfos, refInfos=[];
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
        } else {
            return [];
        }
        const swWorkspace = this.swWorkspace;
        var i = swWorkspace.index.indexOf(fileName);
        if (  i < 0 ) {    
            swWorkspace.symbs.push(symInfos);   
            swWorkspace.index.push(fileName);  
        } else {
            swWorkspace.symbs[i] = symInfos;         
		}
        return  symInfos;   
    };

    get_codeReferences(codeBlock, codeUri,languageId, token) {
		var fileName = codeUri.fsPath;
        var refInfos = [];
        if(languageId=="magik" || fileName.endsWith(".magik")) {
            refInfos = this.get_magikReferences(codeBlock, codeUri, token); 
        // } else if(fileName.endsWith("\module.def")) {
        //     symInfos = this.get_moduleReferences(codeBlock, codeUri, token);
        // } else if(fileName.endsWith("\product.def")) {
        //     symInfos = this.get_productReferences(codeBlock, codeUri, token);
        // } else if (fileName.endsWith("\gis_aliases")) {
        //     symInfos = this.get_aliasesReferences(codeBlock, codeUri, token);
        // } else if (fileName.endsWith("\environment.bat")) {
        //     symInfos = this.get_environReferences(codeBlock, codeUri, token);
        } else {
            return [];
        }
        const swWorkspace = this.swWorkspace;
        swWorkspace.refes[fileName] = refInfos;         
        return  refInfos;   
    };

    scanWorkspace(rootPath,caller,token) {
		if (!rootPath) {
			var aTextEditor = vscode.window.activeTextEditor;
	        if (aTextEditor)
				rootPath = vscode.workspace.getWorkspaceFolder(aTextEditor.document.uri).uri.fsPath;
			else 
				rootPath = vscode.workspace.rootPath;
		}	
      
        if (!rootPath) {
            vscode.window.showInformationMessage('No workspace is open to find symbols.');
            return;
		};

		const ignorePattern = [".git",".vscode"];
		const includePattern = [".magik","\module.def","\product.def","\gis_aliases","\environment.bat"];
        const swgis = this.swgis;
        const swWorkspace = swgis.swWorkspace;
        const isFileSignature = function(fName, fSignatures) {
			for(var f in fSignatures)
				if(fName.endsWith(fSignatures[f])) return true;
		}

		const grab = function(dir,codeScanner) {
			if ( isFileSignature(dir,ignorePattern) ) return 0;
			var fileList = fs.readdirSync(dir) 
			var count = fileList.length;
			for(var i in fileList){
				var file = dir + '/' + fileList[i];
				var stat = fs.statSync(file);
				if (!stat || isFileSignature(file,ignorePattern) ) {
					// ignore
				} else if (stat.isDirectory()) {
//					console.log( "--- swgis Scanning ("+i+"/"+fileList.length+") "+dir.replace(rootPath,".") );		
					count += grab(file,codeScanner);
				} else if( isFileSignature(file,includePattern) && swWorkspace.index.indexOf(file) < 0 ) {    
 					let symbs = codeScanner(file);
                }	
			}
			return count;
		}         

		const walk = async function(rootPath, codeScanner){
			try {
				swWorkspace.paths.push(rootPath);
				var d1 = new Date();
				var count = await grab(rootPath, codeScanner);
				var t = Math.round((new Date().getTime()-d1.getTime())/1000);
				vscode.window.showInformationMessage("Scanning Workspace took: "+t+"s - files: "+count+" - "+rootPath);
				console.log("--- scanWorkspace: -Count: "+count+" -Time: "+t+"s - "+rootPath);		
			} catch(err) {
				var i = swWorkspace.paths.indexOf(rootPath)
				if (i>-1) 
					swWorkspace.paths[i] = "Failed";
				vscode.window.showInformationMessage("Scanning Workspace Failed "+err.message+" "+rootPath);
				console.log("--- scanWorkspace:  Error: "+err.message+" - "+rootPath);		
			}   
		}

		const grob = function(dir,pathIndex,codeScanner) {
			if ( isFileSignature(dir,ignorePattern) ) return 0;
			var fileList = fs.readdirSync(dir) 
			var count = fileList.length;
			for(var i in fileList){
				var file = dir + '\\' + fileList[i];
				var stat = fs.statSync(file);
				if (!stat || isFileSignature(file,ignorePattern) ) {
					// ignore
				} else if (stat.isDirectory()) {
//					console.log( "--- swgis Scanning ("+i+"/"+fileList.length+") "+dir.replace(rootPath,".") );		
					count += grob(file,pathIndex,codeScanner,codeScanner);
				} else if(!pathIndex[file] && isFileSignature(file,includePattern)) {    
					 let data = codeScanner(file);
					 pathIndex[file] = data;
                }	
			}
			return count;
		}         
	
		const work = async function(rootPath,pathIndex, codeScanner){
			try {
				if (pathIndex[rootPath]) return;
				var d1 = new Date();
				var count = await grob(rootPath,pathIndex,codeScanner);
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
		if (caller=='provideReferences') {
			pathIndex = swWorkspace.refes;
			codeScanner = function(arg){ return eng.get_fileReferences(arg);}
            work(rootPath,pathIndex,codeScanner);    


        } else if (swWorkspace.paths.indexOf(rootPath)<0) {
			pathIndex = swWorkspace.symbs;
			codeScanner = function(arg){ return eng.get_fileSymbols(arg);}
            walk(rootPath,codeScanner);    
            swWorkspace.paths.push(rootPath);
        };

        return pathIndex; 
    }
    

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
        const methodsToIgnore = parserKeys.methodsToIgnore;
		const objectsToIgnore = /\b(_self|_super)\b/i;
        const refes = {};
		const pushRef = function(tag,lineIndex,charIndex){
			let pos = new vscode.Position(lineIndex,charIndex);
			tag = tag.trim().toLowerCase();
			if (!refes[tag]) refes[tag] = [];
			refes[tag].push( new vscode.Location(codeUri, pos));
		};
		var codeLines = codeBlock.split("\n");
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
            var codeLine = codeLines[lineCount].split('#')[0];
			let match;
            while (match = class_dot_bare_method.exec(codeLine)) {
				// codeLine = magikParser.maskStringComments( codeLine );
				// if (magikParser.testInString(codeLine,match.index,true)) continue;
				let ref = match[0].split(".");
				// if (methodsToIgnore.test(ref[1])) continue;
				// let def = new RegExp('_method\\s+'+ref[0],'i') ;
				// if (def.test(codeLine)) continue;
				pushRef(ref[1],lineCount,match.index + match[0].length - ref[1].length);
				// if (objectsToIgnore.test(ref[0])) continue;
				// pushRef(ref[0],lineCount,match.index);
			}
        }
        return refes;
    }

    get_magikSymbols(codeBlock, codeUri, token){
        var symRef = [];
        var symRefIndex = [];
		var lastContainer = null;  
		var codeLines = codeBlock.split("\n");
		var vsSymbols = this.parse_magikTags(codeLines,codeUri);
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
			var label = tag.nodeName; //+ " " + tag.keyPosition.line;
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
              
    parse_magikTags(codeLines,codeUri) {
		var tags = [], codeLinesTags, swPackage ='';
		var recursiveCodeOutline = vscode.workspace.getConfiguration('Smallworld').get("recursiveCodeOutline");
		// parse the document for symbols
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
			if (/_package/i.test(codeLines[lineCount])) {
				swPackage = codeLines[lineCount].replace(/_package\s+/i,'').replace(/\s+/i,'').split(/\W/)[0].toLowerCase();
				continue;
			}
			codeLinesTags = this.parse_magikSyntax(codeLines,lineCount,swPackage);
			for (var i in codeLinesTags){
				var tag = codeLinesTags[i];
				// build node and container names    
				var parentName, methd, parms;
				var tagTxt = tag.text;
				try {
					switch (tag.keyWord) {
					case '_method':
						let match = magikParser.keyPattern.class_dot_method.exec(tag.text)
						if (match) match = match[0];
						else  match = tag.text;
						match = match.split(".");
						parentName = match[0];
						methd =  magikParser.proofMethodName(match[match.length-1]);
						parms = "";
						break; 
					case '_proc':
						if (tagTxt.indexOf("<<") < 0 && tag.keyPosition.line > 0){
							var lastline = codeLines[tag.keyPosition.line-1];
							if (lastline.indexOf("<<") >= 0) tagTxt = lastline + tagTxt;
						} ;   
					case '_block':
						parentName = null;//tag.keyWord;
						methd = tag.keyWord + " ";
						if ((i = tagTxt.indexOf("<<")) > -1) {
							var arr = tagTxt.slice(0,i).trim().split(" ");
							parms = arr[arr.length-1].trim();
						} else if (tagTxt.indexOf("@") > -1){
							parms = tagTxt.slice(tagTxt.indexOf("@")).split("(")[0].trim();
						} else {
							parms = "@unammed";
						}
						if (tagTxt.indexOf("(") > -1) 
							parms += "()";    
						break;    
					case '_dynamic':
					case '_global':
					case '_constant':
						parentName =  null;//tag.keyWord;
						methd = tag.keyWord+ " ";
						var arr = tagTxt.split(tag.keyWord);
						parms = arr[arr.length-1];
						if ((i=parms.indexOf("<<")) > -1)            
							parms = parms.slice(0,i).trim().split(" ")[0];
						else  
							parms = parms.trim();
						break;    
					case 'def_mixin':
					case 'def_slotted_exemplar':
						parentName = tag.params.split('(')[1].split(',')[0];
						methd = tag.keyWord;
						parms = "";
						break;                       
					case 'condition.define_condition':
					case 'smallworld_product.register_application':
					case 'magik_session.register_new':
						parentName = tag.keyWord.split(".")[0];               
						methd = tag.params.split('(')[1].split(',')[0];
						parms = "";
						break;    
					case 'sw!patch_software':
						parentName = null;
						methd = tagTxt.trim();
						parms = "";                 
						break;    
					default:
						parentName = tagTxt.split(".")[0].trim();
						if (tag.params.length > 0 )
							methd = tag.params.split(',')[0];
						else 
							methd = tag.text.split('(')[1].split(',')[0];
						parms = "";
					}	
				} catch(err) {
					console.log("---parse_magikTags Error: "+err.message+" - "+ codeLines[lineCount]+" - "+codeUri.fsPath);
					console.log(tag);
				}
				if (parentName)  parentName = parentName.replace(/[\"\':]/g,'');
				if (methd)  methd = methd.replace(/[\"\':]/g,'');

				tag.containerName = parentName;
				tag.nodeName = methd+parms;    
				tags.push(tag);

				if (!recursiveCodeOutline) lineCount = (tag.endPosition)? tag.endPosition.line : lineCount;
			}   
        }  
        return tags;  
    }

    parse_magikSyntax(code,keyLine,swPackage) {
		var lineText = code[keyLine];
		var tagKeys = [];
		var pCount =0;
        let match, keys = magikParser.magikKeys(); 
        while ((match = keys.regexp.exec(lineText)) !== null) {
            var keyPos = match.index;
            if (magikParser.testInString(lineText,keyPos,true)) continue;
            
			// check tag    
            var tagKey = keys.index[match[1].toLowerCase()];
			
			if (/_global/i.test(tagKey)) {
					if (/_global\s+_constant/i.test(lineText)) continue;
            } else if (/(_global|_constant)/i.test(tagKey)) {
                if (/(_global\s+_constant\s+_proc[@\s\(|_global\s+_proc[@\s\(])/i.test(lineText)) continue;
            }
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
                    keyPos = keyPos+tagKey.length;
                    if (tagKey[0]=='_') keyPos+=1;
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
                keyWord:     mSymb[0], 
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
            tagKeys.push(tag);
        }
        return tagKeys;
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
		// const prefixes = /\b(_iter|_abstract|_private|_pragma)\b/i;
		const prefixes = /\b(_iter|_abstract|_private)\b/i;
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

