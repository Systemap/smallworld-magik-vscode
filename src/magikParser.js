// ---------------------------------------------------------
//   siamz.smallworld-magik
//  --------------------------------------------------------
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require('vscode');
const vsSK = vscode.SymbolKind;
const magikTagKeys={
	regexp: null,
	index: null
};
const magikSymbols = {
    _method                : ['_method',            '_endmethod', '()', vsSK.Method],
    _proc                  : [ '_proc',               '_endproc', '()', vsSK.Function],
    _block                 : ['_block',              '_endblock', '', vsSK.Function],
    _global                : ['_global',               '_global', '<<', vsSK.Variable],
    _constant              : ['_constant',           '_constant', '<<', vsSK.Variable],
    _dynamic               : ['_dynamic',             '_dynamic', '<<', vsSK.Variable],
    def_mixin              : ['def_mixin',                   ')', '()', vsSK.Property], 
    def_slotted_exemplar   : ['def_slotted_exemplar',        ')', '()', vsSK.Property], 
    define_slot_access     : ['define_slot_access',          ')', '()', vsSK.Property], 
    define_shared_variable : ['define_shared_variable',      ')', '()', vsSK.Variable], 
    define_shared_constant : ['define_shared_constant',      ')', '()', vsSK.Constant], 
    define_property        : ['define_property',             ')', '()', vsSK.Property], 
    def_property           : ['def_property' ,               ')', '()', vsSK.Property],
    condition              : ['condition.define_condition',  ')', '()', vsSK.Constant],
    register_new           : ['magik_session.register_new',  ')', '()', vsSK.Module],
    register_application   : ['smallworld_product.register_application', ')','()', vsSK.Module],
    'sw!patch_software'    : ['sw!patch_software',           ')', '()', vsSK.Module]
}
exports.magikSymbols = magikSymbols;

const magikStringPattern = {           
    '"': /[^"]/,
   "'":  /[^']/,
   ":|": /[^|]/,
   ":" : /[a-z!?_A-Z0-9]/,
   "%":  /(%\.|%space|%tab|%newline)/
}
exports.magikStringPattern = magikStringPattern ;

function magikKeys(){
	if (!magikTagKeys.index) {
		var mKeys ="(";
		var index = [];
		for( var k in magikSymbols) {
			var ms =  magikSymbols[k];
			mKeys +=   ms[0] + '|';
			index[ms[0]] = k;
			// ms[0] = new RegExp(ms[0]);
			// ms[1] = new RegExp(ms[1]);
		};
		mKeys= mKeys.slice(0,mKeys.length-1) + ')';
		magikTagKeys.regexp= new RegExp("\\b"+ mKeys + "\\b" ,"ig");
		magikTagKeys.index = index;
	}
	return magikTagKeys;
}
exports.magikKeys = magikKeys ;

function  getTagText(lineText, tagKey) {
        var tagIdx =  (tagKey == '\n')? 0 : lineText.indexOf(tagKey);
        if (tagIdx < 0) return;
 
        var tagTxt = trimComments(lineText);
//        var syntax = parse_magikLine(lineText) ;
        if (tagTxt.length < tagIdx) return;
        tagIdx = tagTxt.indexOf(tagKey);     
        if (tagKey[0]=="_" &&  tagIdx >= 0)   {            
             let str = RegExp ("\\b"+tagKey+"\\b");     
             tagIdx = lineText.search(str);
             if (testInString(tagIdx) )
                return;
        };           
     return tagTxt;   
}        
exports.getTagText = getTagText

function  testInString(tagTxt,pos,inComment) {
	var n = tagTxt.length;
	for(var i=0; i<pos; i++){
		var ch = tagTxt[i];
		if (/[#"':]/.test(ch) == false) continue;
		if (ch=='#') return inComment==true;
		if (i>0 && tagTxt[i-1]=='%') continue;
		if (i+1<n && ch==':' && tagTxt[i+1]=='|') ch=":|";
		i = i + ch.length; 
		var strPttrn = magikStringPattern[ch];
		while(i<n && strPttrn.test(tagTxt[i])) ++i;
		if (i > pos) return true;
	}
	return false;
}
exports.testInString = testInString;

function trimComments(tagTxt) {
	let match, regex = /#/ig;
	while (match = regex.exec(tagTxt)) 
		if(match.index == 0) 
			return "";
		else if (!testInString(tagTxt,match.index))
			return tagTxt.slice(0,match.index-1).trim();
	return tagTxt.trim();
}
exports.trimComments = trimComments;

function get_SyntaxArguments(syntaxText,keyPos) {
	// params
	var params = [], n = -1;
	var pCount = 0;
		for (var i= keyPos; i< syntaxText.length; ++i) {
			var ch = syntaxText[i];
			if (pCount) 
				if (ch==',' && !testInString(syntaxText,i)) {params.push(""); n++}  
				else if (ch==')' && !testInString(syntaxText,i))
					if (--pCount) params[n] +=ch;
					else break; 
				else if (ch=='(' && !testInString(syntaxText,i)) {params[n]+=ch; pCount++} 
				else params[n] +=ch;
			else if (ch ==')') --pCount;
			else if (ch =='('){params.push(""); n++; pCount++}  
		};
	return params
}
exports.get_SyntaxArguments = get_SyntaxArguments    

function parse_magikLine(lineText) {

	var c,s;
	var syntax = [""];
	for(var i=0; i< lineText.length; ++i ){
		var s = lineText[i];
		if (s=='#'){
			s = lineText.slice(i, lineText.length-1);
			syntax.push(s);
			break;
		} else if (/[a-z!?_A-Z:]/.test(s)){
			while (/[a-z!?_A-Z0-9]/.test(c = lineText[++i])) s+=c;
			syntax.push(s);
		} else if (/[\+\-0-9]/.test(s)){
			while (/[eE.0-9]/.test(c = lineText[++i])) s+=c;
			syntax.push(s);
		} else if (/({|\"|\'|:\|)/.test(s)){
			[['{','}'],["'","'"],[":|","|"]].forEach( function(ch){
				if (ch[0] != s) return;
				while ((c = lineText[++i]) != ch[1]) s+=c;
				s += ch[1];
				syntax.push(s);
			}); 
			continue;
		} else if (/[+-,()[\]]/.test(s)){
			syntax.push(s);
		} else if (/\S/.test(s)){
			syntax.push(s);
		};   
		syntax[0] += s;
	};
	return syntax;
}
exports.parse_magikLine = parse_magikLine    

