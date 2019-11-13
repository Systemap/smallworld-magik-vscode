// ---------------------------------------------------------
//   siamz.smallworld-magik
// ---------------------------------------------------------
'use strict';
const vscode = require('vscode');
const { exec } = require('child_process');
const fs = require("fs");
const os = require("os");
const codeBrowser = require('./codeBrowser');
const workbenchConfig = vscode.workspace.getConfiguration('Smallworld');

class swCb {
    constructor(cEAgent) {
        this.cEAgent = cEAgent;
        this.swgis = cEAgent.swgis;
        this.scheme = 'swCB';
        this.timeout = null;
        // this.status = null;
        // emitter and its event
        this.onDidChangeEmitter = null;
        this.onDidChange =null;
		this.findString = '';
		this.command = ''; 
		this.details = false; 
		this.inherit = "inherit_not_obj\n";
    }

    run(context,disposable) {
        const cbMan = this;
        const cbDoc = new class { 
            constructor(){
                this.onDidChangeEmitter = new vscode.EventEmitter();
                this.onDidChange = this.onDidChangeEmitter.event;
            }
            provideTextDocumentContent(uri) {
                return cbMan.format(uri);
            }
        }
        context.subscriptions.push(cbDoc);
        disposable.push( vscode.workspace.registerTextDocumentContentProvider( cbMan.scheme, cbDoc));
        disposable.push( vscode.languages.registerHoverProvider(this.scheme,this.cEAgent));

        cbMan.pTDC = cbDoc;
		const vscCmd = vscode.commands;
        // register a command that opens a cb-document
        disposable.push( vscCmd.registerCommand('swCb.open', function(context) {cbMan.open('',context)}) );
        // register a command that search the current cb
        disposable.push( vscCmd.registerTextEditorCommand( "swCb.find",  function(edt,chg,cmd) { cbMan.find(cmd,edt,chg) }) );

        // register a command that jump to the current cb
        disposable.push( vscCmd.registerCommand('swCb.jump', function(context,code,callback) {cbMan.jump(context,code,callback)}) );
        disposable.push( vscCmd.registerCommand('swCb.refresh', function(context) { cbMan.refresh(context)}) );
        disposable.push( vscCmd.registerCommand('swCb.comments', function(context) { cbMan.commentsFold(context)}) );
        disposable.push( vscCmd.registerCommand('swCb.inherit', function(context) {cbMan.inheritSwitch(context)}) );
        disposable.push( vscCmd.registerCommand('swCb.inheritLocal', function(context) {cbMan.inheritSwitch('local')}) );
        disposable.push( vscCmd.registerCommand('swCb.inheritParent', function(context) {cbMan.inheritSwitch('parent')}) );
        disposable.push( vscCmd.registerCommand('swCb.inheritObject', function(context) {cbMan.inheritSwitch('object')}) );

        const swCBscheme = this.scheme;
        vscode.workspace.onDidOpenTextDocument(event => {
            let doc = event;
            if (doc.uri.scheme !== swCBscheme ) return; // not my scheme
            // swgis.cbDocument = doc;
            console.log("onDidOpenTextDocument" + doc.uri.scheme);
            vscode.languages.setTextDocumentLanguage(doc,swCBscheme);
		}, null, context.subscriptions);
		
       	vscode.workspace.onDidChangeTextDocument(event => {
            let doc = event;
            if (doc.uri.scheme !== swCBscheme ) return; // not my scheme
			let editor = vscode.window.activeTextEditor;
			if (!editor) return; 
            console.log("onDidChangeTextDocument" + doc.uri.scheme);
		}, null, context.subscriptions); 

        vscode.workspace.onDidCloseTextDocument(event => {
            let doc = event;
            if (doc.uri.scheme !== swCBscheme ) return; // not my scheme
            console.log("onDidCloseTextDocument" + doc.uri.scheme);
        }, null, context.subscriptions);
    }

    open(context,callback) {
        const swgis = this.swgis;
        const aSession =  swgis.getActiveSession();
        if (!aSession) {
            return swgis.redialSession("Start a GIS Session for Class Browser");
        } else if (!swgis.getActiveSession('cbAgent')){     
            vscode.window.showInformationMessage("SW Class Browser connecting to session...");
            swgis.cbData = ['open>'+context];
            this.connect(context); 
        } 
        if (!swgis.cbDocument){
            let uri = vscode.Uri.parse(this.scheme+':!swCB!' );
            let aPromise = vscode.workspace.openTextDocument(uri); // calls back into the provider
            swgis.cbDocument = aPromise;
            vscode.window.showTextDocument(aPromise, { preview: false });
            aPromise.then(cbDoc=>{  
                swgis.cbDocument = cbDoc;
				this.ask(context,'open');     
            });
            aPromise.catch(err=>{  
				swgis.cbDocument = null;
				vscode.window.showWarningMessage("SW Class Browser Document failed: "+err.message); 
            });
        } else { 	
           this.ask(context,'open');     
		}
    }

    jump (context,classMethod,callback){
        const swgis = this.swgis;
        const cbAgent =  swgis.getActiveSession('cbAgent');
        if (!cbAgent){     
            if(callback!='open')
                this.open(context); 
            return;    
        } else if(callback=='goto'){
            return this.goto(context,classMethod); 
        } 

        let editor = vscode.window.activeTextEditor;
		if (classMethod){

        } else if (editor) {
            var srange = editor.selection;
            classMethod = this.cEAgent.getClassMethodAtPosition(editor.document,srange.start) ;
        } else {
          return;
        }
		if (classMethod){ 
            classMethod = classMethod.split(".")
            swgis.cbData = ['jump> '+ classMethod[1] + " " + classMethod[0] ];
            cbAgent.stdin.write( "pr_source_file " + classMethod[1] + " " + classMethod[0] + "\n" );
        }
    }

    send(mf_command,callback,imprint){
        const swgis = this.swgis;
        const cbAgent =  swgis.getActiveSession('cbAgent');
        if (!cbAgent){     
            return;    
		} 
        callback = (callback)? callback:'send';
        mf_command = mf_command.toString().replace(/,/g,'');
        imprint = (imprint)? imprint:'';
        swgis.cbData = [callback + '>' + imprint];
        this.refresh();
		cbAgent.stdin.write(mf_command) ;
		cbAgent.stdin.write('print_curr_methods\n');
    }

    find(context,callback){
        const swgis = this.swgis;
        if (!swgis.getActiveSession()) {
            return swgis.redialSession("Start a GIS Session for Class Browser");
        }

        if (!context || !context.search) {
            let editor = vscode.window.activeTextEditor
            if (!callback || callback.selection)
                editor = callback
            var srange = editor.selection;
            context = this.cEAgent.getClassMethodAtPosition(editor.document,srange.start);
        } else if ( context.search ){
			if (context.search("!swCB!: ")==0) context = context.slice(8);
        } else {
            context = '';
        }

        const cbAgent =  swgis.getActiveSession('cbAgent');
        if (!cbAgent)
           return this.connect(context,'find'); 
        else if (!swgis.cbDocument){
			if(callback!='open')
                this.open(context); 
            return;    
        } 

		if (!context) {
			if(callback!='open') this.open(callback); 
			return;
		}
		this.findString = context;
        const _self = this;
        const find = async (findString) => {
        // const find = function(context){
            
            if (findString){

            } else if (!editor || editor.document.languageId != "magik") {
				return;
            } else {
                 // try to find method class 
                var srange = editor.selection;
                findString = editor.document.getWordRangeAtPosition(srange.start);
                findString = await vscode.window.showInputBox({ placeHolder: 'SW Class Browser input: class.method', value: findString});
            }

			swgis.cbData = ['find>'+findString];
            // this.proxy(null,'find');
            let mf_command =   [
                "show_method_names\n", //"dont_show_method_names"],
                "show_classes\n" ,      // "dont_show_classes"],
                "show_topics\n",    //   "dont_show_topics"],
                "show_comments\n",
                "show_args\n",
                "unadd subclass\n",
                "unadd redefinable\n",
                "unadd debug\n",
                "unadd advanced\n",
                "unadd basic\n",
                "unadd restricted\n",
                "unadd deprecated\n",
                "method_cut_off 5000\n"
            ];
            let flags = '';
            let topics= "override_topics\n"
            let inherit = 'inherit_not_obj\n'
            let command = findString.split(/\s/g);
            for(var i in command){
                let cm = command[i].toLowerCase();
                if(!cm){
                     // ignore               	
                } else if (cm=='*loc') {
					inherit = 'local_only\n';
                } else if (cm=='*obj'){
					inherit = 'inherit_all\n'; 
                } else if (cm=='*dp'){
                    flags += "add deprecated\n";
                } else if (cm=='*rs'){
                    flags +="add restricted\n";
                } else if (cm=='*b'){
					flags +="add basic\n";
                } else if (cm=='*a'){
					flags +="add advanced\n";
                } else if(cm=='*s'){
					flags +="add subclass\n";
                } else if (cm=='*r'){
					flags +="add redefinable\n";
                } else if (cm=='*d') {
                    flags +="add debug\n";
                } else if (cm=='*t'){
                    topics = "dont_override_topics\n" 
                } else if (cm.indexOf('*')>-1){
                    console.log('swCB find> invalid syntax  '+cm);
                } else {
                    var filter = cm.split(".");
                    if (cm[0]=="."){
                        mf_command.push("method_name "+filter[1]+"\n"+"unadd class\n"+"add class\n");
                    } else if (filter.length > 1){
                        mf_command.push("method_name "+filter[1]+"\n"+"unadd class\n"+"add class "+filter[0]+"\n")
                    } else 	{
                        mf_command.push("method_name\n"+"unadd class\n"+"add class "+filter[0]+"\n")				
                    }
                }    
            }
            if (flags)  
                mf_command.push(flags+"dont_override_flags\n");
            else 
                mf_command.push("override_flags\n");
            mf_command.push(inherit);
            mf_command.push(topics);
            _self.send(mf_command,'find',findString)
        }
        
        find(context);
    }

    goto(sourceFile,cmPrint){
        sourceFile = sourceFile.replace(/\//g,"\\").trim();
        const swgis = this.swgis;
        if (cmPrint){
            cmPrint = cmPrint.trim().split(/\s+/);
            cmPrint = cmPrint[1]+"."+cmPrint[0];
        }

		const goto = async function(pathFilename,cmPrint){
			try {
				var symbs = swgis.filterWorkspaceSymbs(cmPrint,pathFilename)
				if (!symbs.length){
					let cBrows = new codeBrowser.codeBrowser(swgis);
					cBrows.get_fileSymbols(pathFilename); 	
					symbs = swgis.filterWorkspaceSymbs(cmPrint,pathFilename);
				}
				if (symbs.length){
                        // vscode.commands.executeCommand('workbench.action.gotoSymbol',symbs[symbs.length-1]);
                        let loc = symbs[symbs.length-1].location;
                        let start = new vscode.Range(loc.range.start,loc.range.start);
					    await vscode.window.showTextDocument(loc, { preview: true, selection: start });
                        
				} else {
					var codeUri =  vscode.Uri.file(pathFilename);
					await vscode.window.showTextDocument(codeUri, { preview: true });
			    }
			} catch (err){
				vscode.window.showWarningMessage("swCB Failed: "+err.message); 
		    }
		}

        const aSession =  swgis.activeSession;
        const pDirs = aSession.cbSocket
        let fileName = sourceFile;
        let prodPath, prodName = fileName.match(/\$[\w!?-]+(_dir)*\\/i);
        if (prodName && prodName.index==0){
            let env = prodName[0];
            prodName = env.slice(1).split(/(_dir)*\\/i)[0].toUpperCase();
            fileName = fileName.replace( env,'\\');
            if (pDirs[prodName])
                prodPath = pDirs[prodName];
            else  
            prodPath = '';   
        } else {
            prodPath = '';
        }
        try {
            fs.statSync(prodPath+fileName);
            return 	goto(prodPath+fileName,cmPrint);
        } catch(err) { }
        let prodPath1;
        let results = swgis.filterWorkspaceRefs(prodName);  
        for (var i in results) {
            try {
                let prodPath1 = results[i];
                fs.statSync(prodPath1+fileName);
                break;
            } catch(err) { prodPath1=''; }
        }
        if (!prodPath1) {
            var workspaceFolders = vscode.workspace.workspaceFolders
			for(var i in workspaceFolders) {
                try {
                    prodPath1 = workspaceFolders[i].uri.fsPath;
                    fs.statSync(prodPath1+fileName);
                    break;
                } catch(err) { prodPath1=''; }
			}			
        }
        if (!prodPath1){
            results = swgis.filterWorkspaceSymbs(cmPrint);  
            for (var i in results) {
                try {
                    prodPath1 = results[i].location.uri.fsPath;
                    let n = prodPath1.indexOf(fileName);
                    if (n>-1) prodPath1 = prodPath1.slice(0,n);
                        fs.statSync(prodPath1+fileName);
                    break;
                } catch(err) { prodPath1=''; }
            }
        }
        if (prodPath1){ prodPath=prodPath1;}

        const loadFrom=function(what){
            var f = fileName.lastIndexOf('\\');
            var fname =fileName.slice(f+1), pname= fileName.slice(0,f);
        if (what=='Select Source File') {
                f =  vscode.Uri.file(fname)//.with({path: pname, fragment: fname});
                vscode.window.showOpenDialog({
                    defaultUri: f,
                    filters: {'Magik': ['magik',fileName.slice(f+1)], 'All':['*']}
                }).then((fUri)=>{
                    if (!fUri || !fUri.length) return;
                    let fname = fUri[0].fsPath, i = fname.toLowerCase().indexOf(fileName.toLowerCase())
                    if (i>-1){
                        prodPath = fname.slice(0,i);
                        vscode.window.showInformationMessage("Map Product ("+prodName+") to "+prodPath, "Set for this session").then( (map)=>{
                            pDirs[prodName] = prodPath;
                        });
                    }
                    goto(fname,cmPrint);
                });
             } else if (what=='Select Product Path') {
                    f =  vscode.Uri.file(prodPath);//.with({path: prodPath});
                    vscode.window.showOpenDialog({
                        canSelectFolders: true,
                        canSelectMany:false,
                        openLabel: "Map to %"+prodName+"%",
                        defaultUri: f
                    }).then((fUri)=>{
                        if (!fUri || !fUri.length) return;
                        prodPath = fUri[0].fsPath;
                        pDirs[prodName] = prodPath;
                        goto(prodPath+fileName,cmPrint);
                        });
            
            } else if (what=='Map to '+prodPath) {
                pDirs[prodName] = prodPath;
                goto(prodPath+fileName,cmPrint);
            }
        }

        let mapTO = '';
        if (prodPath)
            mapTO = 'Map to '+prodPath; 
        vscode.window.showInformationMessage("Source file not found: "+sourceFile, "Select Product Path","Select Source File", mapTO).then( loadFrom );

    }
    
    eof(){
        const swgis = this.swgis;
        const cbData = swgis.cbData; 
        if (cbData && cbData.length)
            return cbData[cbData.length-1].slice(-3)
    }
    
    async proxy(context,callback){
		const swgis = this.swgis;
        const cbData = swgis.cbData; 
        let flag = cbData[0].slice(0,5);
        let findString = cbData[0].slice(5);
       
        console.log('proxy - context '+context+' - call '+callback +' - flag '+flag);
        switch (flag){
            case 'jump>':
                console.log(cbData.toString());
                var cmPrint = cbData[0].slice(5);
                var fileName = cbData[1].replace(/<\d+>/,'').replace(cmPrint,"");
                 return this.goto(fileName,cmPrint);
            case 'open>':
                if (cbData[1].search('-no-topic')>-1){
                    swgis.cbData = ['find>'+findString]; 
                    return this.find(findString);
                }
            case 'ping>':
                if (this.eof() == '<5>') 
                    this.pTDC.onDidChangeEmitter.fire(cbDoc.uri);			
                return;
            case 'find>':
            case 'send>':
            default:  
             // no-proxy action
       }
              
       const cbDoc = swgis.cbDocument;
       if (!cbDoc) return;
            if (this.eof() == '<5>') {
            } else 
                return;
            let cbUri = cbDoc.uri;
            let ed = await vscode.window.showTextDocument(cbUri, {preview: false}, true);
            // if (ed.document.uri.scheme == cbUri.scheme) await ed.hide();
            // let path = (cbUri.path.indexOf(' '))? ' '+cbUri.path : cbUri.path.slice(1);
            // cbUri = cbUri.with({ path: path });
            await this.pTDC.onDidChangeEmitter.fire(cbUri);			
            let start = { preview: false};//,  selection: new vscode.Range(0,0,1,0)};
            ed = await vscode.window.showTextDocument(cbUri,start,true);
            let fold = await vscode.commands.executeCommand('editor.foldAll','direction', 'up');
            swgis.cbDocument = ed.document;
            console.log("proxy showTextDocument done. "+findString);
    }
    async refresh(){
		const swgis = this.swgis;
        const cbDoc = swgis.cbDocument;
        if (!cbDoc) return;
            let newUri = cbDoc.uri;
            this.pTDC.onDidChangeEmitter.fire(newUri);			
            let start = { preview: false,  selection: new vscode.Range(0,0,1,0)};
            await vscode.window.showTextDocument(newUri,start,true);
    }

    format(uri){
        var findString = this.findString;
        if (findString) 
            findString = findString.split(".");
        else 
        findString = [null];

        let swgis = this.swgis;
        let doc = swgis.cbDocument; 
		let cbData = swgis.cbData; 
        var chunk = '';
        for (var d=1; d < cbData.length; d++) {
			chunk += cbData[d]	
        }
        // chunk = chunk.replace(/`/g,"\'");
        chunk = chunk.replace(/\n\s*\n/gm,"\n");

        const pad= function(str,padding){
            str = str.trim();
            padding = padding-str.length;
            if (padding>0)  str += ' '.repeat(padding);
            return str;
        }
       
        let mf_data = [];
		let skip = String.fromCharCode(20);
        let classicLayout = false, inherit =  this.inherit;
        const format = function(chunk){
            let cb_text = '';//# <proxy-control-'+cbData[0];                  
            chunk = chunk.split("\n");
            for (var i in chunk){
                var nameStr = chunk[i];
                try {
                    // topic = (topic)? topic : nameStr==skip+'-no-topic';
                    if (!nameStr || nameStr.length == 0 || nameStr.indexOf('<5>')>-1) {
                        continue;	
                    } else if (nameStr.search(/\s*\*/)==0)  {
                        nameStr = nameStr.replace(/`/g,"\'").trim();
                    } else if (nameStr.search(/\s+/)==0)  {
                        nameStr = nameStr.replace(/\s+/,'\t');
                    } else if (nameStr.search(/<20>/)==0)  {
                        nameStr = nameStr.replace('<20>','_pragma(topic=')+')';
                        // continue;
                    } else if (/\s+IN\s+/.test(nameStr))  {
                        var arr = nameStr.trim().split(/\s+/g);
                        if (classicLayout) 
                            nameStr = pad("." + pad(arr[0],40) +" IN "+arr[2], 80);
                        else 
                            nameStr = pad(pad(arr[2],40) + " ." + arr[0], 80);
                        if (arr.length>3){
                            nameStr += " _pragma( "; 
                            for (var i = 3;arr.length>i;i++) nameStr += (arr[i]+" ");
                            nameStr += ')';
                        }
                    }   
                }catch (err){ console.log(i+' ('+nameStr +') '+err.message)}
                // mf_data.push(nameStr);
                cb_text += nameStr + "\n";

                swgis.cbInfo = mf_data;
            }
            return cb_text;
        }
        let cb_text = format(chunk);
        var d = new Date();
		let status = "# SW Class Browser '"+ this.findString +"' "+ d.toLocaleString();
        if (!doc){
            status += "(connecting...)";
        } else if(swgis.getActiveSession('cbAgent')) {
            status += '\n'; //"(connected)";
        } else {
            status += '(connecting...)';
        }
        console.log('format - '+cb_text.length+' '+this.findString);
        // swgis.cbData = [];
        // status = status + '['+this.findString+'] <'+this.inherit[0]+'> ---\n'
        return status + cb_text;
    }
    
    connect(context,callback) {
		const cbMan = this;
        const swgis = cbMan.swgis;
        const aSession = swgis.getActiveSession();
        if (!aSession) 
            return; 
		const cbAgent = swgis.getActiveSession('cbAgent');
       if (cbAgent)    
            return cbAgent; 
       
        const cb_mf_ascii = function(ch) {return  "<"+ch.charCodeAt(0)+">";};

        const cb_mf_connect =  function (dataPack) {
            var n = dataPack.length, ch = dataPack[n-1];
            console.log("cb_mf_connect: "+n+' '+((/[^\x20-\x7E\n\s]/.test(ch))?cb_mf_ascii(ch):'') );  
            dataPack = dataPack.replace(/[^\x20-\x7E\n\s]/g, cb_mf_ascii);
    		swgis.cbData.push(dataPack);
            cbMan.proxy(null,'cb_mf_connect');
        }

        const cb_mf_execute = function(execCommand,n){
    
            //  let cp = spawn(execCommand , 
            //       [],
            //     //   {});
            //       {stdio: ['pipe', 'pipe', 'pipe']});
            //       // {stdio: 'pipe'});
            //  cp.on('close', (code, signal) => {
            //       swgis.sessions = null;
            //       console.log(`child process terminated -------  ${signal}`);
            //   });
      
            let cp = exec(execCommand, {stdio: 'pipe',  maxBuffer: 10*1024*1024}, (err, stdout, stderr) => { 
                if (!err){
                    console.log(stdout);

                } else if (err.code == 1 ){
                        aSession.cbAgent = null;
                        n = (n)? n+1 : 1;
                        console.log(n+" "+err.message);
                        if (n < 10) 
                            return cb_mf_execute(execCommand,n);
                } else {  
                   		    return console.error(err);
                    }
                }
            );
            cp.stdout.on('data', cb_mf_connect );
            aSession.cbAgent = cp;
            console.log("cb_mf_execute: "+ cp)  ;  
            if (callback=='find')
                cbMan.find(context,callback);
        }

        const cb_mf_command = function(mf_pipe){
            //   "Run method finder executable directly
            // Primary use is for debugging the method finder.
            // Do not use unless you understand the method finder direct user interface"
            //   (interactive)
            //   (let* ((acp_path (getenv "SW_ACP_PATH"))
            // 	 (exec_path
            // 	  (if acp_path
            // 	      (append (parse_colon_path acp_path) exec_path)
            // 	    exec_path)))
            //     (comint_run "method_finder")))
            var execCommand = swgis.getActiveSession('SMALLWORLD_GIS');
            if (!execCommand)
                execCommand = swgis.activeSession['SMALLWORLD_GIS'];
            execCommand = execCommand.replace(/\//g,"\\");
            execCommand = execCommand + "\\etc\\x86\\mf_connector.exe -m "+mf_pipe;
            //debug_print
            console.log("cb_mf_command: " + execCommand);
            //Start Smallworld mf_connect.exe 
             cb_mf_execute(execCommand);
        }

        const cb_mf_set_socket= function(mf_pipe, n){
            var wait = 1e5,n=0;
            while( ++n <= wait) {
                try {
                    fs.statSync(mf_pipe);
                    break;
                }
                catch(err) {
	                if(n==wait) 
                        return vscode.window.showWarningMessage("swCB connect cb_mf_set_socket (wait:"+wait+")"+err.message);
                }
            }    
            fs.readFile(mf_pipe,function(err,data){
                console.log("cb_mf_set_socket: "+ err+" data: "+data) ;  
                if (err || !data) 
                    return setTimeout(cb_mf_set_socket,1e3,mf_pipe);
                    
                try {
                    data = data.toString().split(/\n/g);
                    if (data.length) {
                        aSession.cbSocket = { 'method_finder': data[0]};
                        for (var i in data) {
                            var socket = data[i].split(' ');
                            if (socket.length>1){
                                aSession.cbSocket [socket[0].toUpperCase()] = socket[1].replace('\r','');
                            }    
                        }
                        cb_mf_command( aSession.cbSocket['method_finder']);
                    }
                }    
                catch(err) {
                    err = "swCB connect cb_mf_set_socket (pipe:"+mf_pipe+")"+err.message;
                    vscode.window.showWarningMessage(err);  
                }
            });
        }       

        const cb_mf_get_socket= function(mf_pipe){
            setTimeout(cb_mf_set_socket,5e2,mf_pipe);
            console.log("cb_mf_get_socket: "+ mf_pipe)  ;  
        }

        if (aSession.cbSocket && aSession.cbSocket.method_finder) {
            cb_mf_command(aSession.cbSocket['method_finder']);
        } else {
            var mf_pipe = os.tmpdir()+"\\mf_pipe";
            cb_mf_get_socket(mf_pipe);
        }
	}
	
	async ask( context,callback) {
        const swgis = this.swgis;
        let start = new vscode.Position(0,0);
        start = new vscode.Range(0,0,0,0);
        let docOptions = { preview: false,  selection: start };
        let cbDoc =  swgis.cbDocument
        let ed = await vscode.window.showTextDocument(cbDoc.uri,docOptions,true);
        let syntax = "[class].[method] [*loc/obj] [*b] [*a] [*s] [*r] [*d] [*dp] [*rs]";
        let cmd = this.command;
        let idx = cmd.indexOf(' ');
        if (!context){
            context = await vscode.window.showInputBox({ 
                    placeHolder: syntax, 
                    prompt: 'swCB: '+syntax, 
                    valueSelection: [0,idx>0?cmd.length:idx],
                    value: cmd,
                    // validateInput: context => { 
                    //  ste   find(context);
                    //     return context === 'system' ? 'sistem' : null;
                    // },
                    ignoreFocusOut: false
            });
        }

        if (context){
            this.command = context;
            return  this.find(context,callback);
        }
    }

    commentsFold (context) {
        const swgis = this.swgis;
        if (context=='on') 
            this.comments = true;
        else if (context=='off')     
            this.comments = false;
        else     
            this.comments = !this.comments;
        
        // let ed = await vscode.window.showTextDocument(swgis.cbDocument);
       if (this.comments){
            // this.send("show_comments\nshow_args\nshow_topics\n");
            vscode.commands.executeCommand('editor.unfoldAll','direction', 'down');
           context = 'down';
        }else {    
            // this.send("dont_show_comments\ndont_show_args\ndont_show_topics\n");
            vscode.commands.executeCommand('editor.foldAll','direction', 'up');
            context =  'up';
        }   
    }     

    inheritSwitch (context) {
        const cbMan = this;
        if (context=='local') {
            cbMan.inherit = "local_only\n"; 
        } else if (context=="object") {
            cbMan.inherit = "inherit_all\n";
        } else {
            cbMan.inherit = "inherit_not_obj\n"; 
        } 
        cbMan.send(cbMan.inherit);
    }  
}
exports.swCb = swCb;   

