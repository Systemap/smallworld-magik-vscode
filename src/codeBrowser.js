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
		return this.get_codeSymbols(codeBlock, codeUri, token);
    };
        
    get_fileSymbols(fileName) {
		var data = fs.readFileSync(fileName);
		var codeBlock = data.toString();
		var codeUri =  vscode.Uri.file(fileName);
		return this.get_codeSymbols(codeBlock, codeUri);
    }
        
    get_codeSymbols(codeBlock, codeUri, token) {
		var fileName = codeUri.fsPath;
        var symInfos, refInfos=[];
        if(fileName.endsWith(".magik")) {
            symInfos = this.get_magikSymbols(codeBlock, codeUri, token); 
            refInfos = this.get_magikReferences(codeBlock, codeUri, token); 
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
            swWorkspace.refes.push(refInfos);    
        } else 
            swWorkspace.symbs[i] = symInfos;         
            swWorkspace.refes[i] = refInfos;         

        return  symInfos;   
    };

    get_workspaceSymbols(rootPath) {
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
		const includePattern = [".magik",".xml","\module.def","\product.def","\gis_aliases","\environment.bat"];
        const swgis = this.swgis;
        const swWorkspace = swgis.swWorkspace;
        const isFileSignature = function(fName, fSignatures) {
			for(var f in fSignatures)
				if(fName.endsWith(fSignatures[f])) return true;
		}

		const cB =  this;
		const grab = function(dir) {
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
					count += grab(file);
				} else if( isFileSignature(file,includePattern) && swWorkspace.index.indexOf(file) < 0 ) {    
                    try {
                        var symbols = cB.get_fileSymbols(file);
                        swWorkspace.symbs.push(symbols);    
                        swWorkspace.index.push(file); 
                        // console.log("--- get_workspaceSymbols: "+symbols.length+" -"+file);	
                    } catch(err) {
                        console.log("--- get_workspaceSymbols Error:  "+err.message+" - "+file);		
                    }   
                }	
			}
			return count;
		}         

		const walk = async function(rootPath){
			try {
				swWorkspace.paths.push(rootPath);
				var d1 = new Date();
				var count = await grab(rootPath);
				var t = Math.round((new Date().getTime()-d1.getTime())/1000);
				vscode.window.showInformationMessage("Scanning Workspace took: "+t+"s - files: "+count+" - "+rootPath);
				console.log("--- get_workspaceSymbols: -Count: "+count+" -Time: "+t+"s - "+rootPath);		
			} catch(err) {
				var i = swWorkspace.paths.indexOf(rootPath)
				if (i>-1) 
					swWorkspace.paths[i] = "Failed";
				vscode.window.showInformationMessage("Scanning Workspace Failed "+err.message+" "+rootPath);
				console.log("--- get_workspaceSymbols:  Error: "+err.message+" - "+rootPath);		
			}   
		}

        if (swWorkspace.paths.indexOf(rootPath)<0) {
			// vscode.window.showInformationMessage("Scanning Workspace ... "+rootPath);
            walk(rootPath);    
            swWorkspace.paths.push(rootPath);
        };

        return swWorkspace.symbs; 
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
		const commonObjects =/\b(rope|property_list|hash_table)/i;
        const commonmethods =/\b(new\(|new_with\(|add\(|def_shared_constant\(|def_shared_variable\(|empty\?)/i;
        const dot_method_regex = new RegExp(magikParser.keyPattern.dot_method,"g");
        var refes = {};
        var codeLines = codeBlock.split("\n");
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
            var lineText = magikParser.maskStringComments( codeLines[lineCount] )
			let match
            while (match = dot_method_regex.exec(lineText)) {
				let tag = magikParser.proofMethodName(match[0])
				if ( commonmethods.test(tag) )  continue;
                let pos = new vscode.Position(lineCount, match.index);
				if (!refes[tag]) refes[tag] = [];
                refes[tag].push( new vscode.Location(codeUri, pos));
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
		let convertTagToSymbol = function(tag,k,vsSymbols){
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
				var tagRef = [parentName,vscode.SymbolKind.Class,p1,tag.endPosition,parentName];// + " " + i];
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
            vsSymbols.push(symRefInfo); 
        };
        
		// console.log("---get_magikSymbols("+vsSymbols.length+") Done: "+codeUri.fsPath);
        return vsSymbols;
    };

    get_gisSymbols(codeBlock, codeUri, token){
		var symInfos = [];
		var codeLines = codeBlock.split("\n");
		
        // parse the document for functions
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
        var tags = [], codeLinesTags;
            // parse the document for symbols
        for (var lineCount = 0; lineCount < codeLines.length; ++lineCount) {
            try {
                codeLinesTags = this.parse_magikSyntax(codeLines,lineCount);
                for (var i in codeLinesTags){
                    var tag = codeLinesTags[i];
                    // build node and container names    
                    var parentName, methd, parms;
                    var tagTxt = tag.text;
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
                                methd += arr[arr.length-1].trim();
                            } else if (tagTxt.indexOf("@") > -1)
                                methd += "@"+tagTxt.slice(tagTxt.indexOf("@")).split("(")[0].trim();
                            else 
                                methd += "@unammed";
                            if (tagTxt.indexOf("(") > -1) 
                                parms = "()";    
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
                            parentName = tag.params.split('(:')[1].split(',')[0];
                            methd = tag.keyWord;
                            parms = "";
                            break;                       
                        case 'condition.define_condition':
                        case 'smallworld_product.register_application':
                        case 'magik_session.register_new':
                            parentName = tag.keyWord.split(".")[0];               
                            methd = tag.params.split('(:')[1].split(',')[0];
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
                                methd = tag.params.split(',')[0].replace(/[\(:]/,'');
                            else 
                                methd = tag.text.split('(')[1].split(',')[0].replace(/[\(:]/,'');
                            parms = "";
                    };
					tag.containerName = parentName;
                    tag.nodeName = methd+parms;    
                    tags.push(tag);
                }    
            } catch(err) {
                    console.log("---parse_magikTags Error: "+err.message+" - "+ codeLines[lineCount]+" - "+codeUri.fsPath);
            }
        }  
        return tags;  
    }

    parse_magikSyntax(code,keyLine) {
        var lineText = code[keyLine];
		var tagKeys = [];
		var pCount =0;
        let match, keys = magikParser.magikKeys(); 
        while ((match = keys.regexp.exec(lineText)) !== null) {
            var keyPos = match.index;
            if (magikParser.testInString(lineText,keyPos,true)) continue;
            
			// check tag    
            var tagKey = keys.index[match[1].toLowerCase()];

            if (/_global/.test(tagKey)) {
                if (/_global\s+_constant/i.test(lineText)) continue;
            } else if (/(_global|_constant)/.test(tagKey)) {
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
		//} else 
		//	endLine = Math.min(keyLine + 1,doc_length);
		keyPos = new vscode.Position(keyLine,keyPos);
		endPos = Math.max(0, lastLine.lastIndexOf(endWord) + endWord.length);
		endPos = new vscode.Position(endLine,endPos);
		var tagRnge = new vscode.Range(keyPos, endPos);

        return tagRnge   
    }
}
exports.codeBrowser = codeBrowser    

