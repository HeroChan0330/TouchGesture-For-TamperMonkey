// ==UserScript==
// @name         触摸屏视频优化
// @namespace    https://github.com/HeroChan0330
// @version      1.00
// @description  触摸屏视频播放手势支持，上下滑调整音量，左右滑调整进度
// @author       HeroChanSysu
// @match        https://*/*
// @match        http://*/*
// @match        ftp://*/*
// @grant        GM_addStyle
// ==/UserScript==

var TouchGesture={forbidScroll:false};



TouchGesture.VideoGesture=function(videoElement){
    this.touchStartPt=null;
    this.sweepDir=0; //0:no sweep 1:up 2:down 3:left 4:right
    this.startTouchVideoTime;
    this.startTouchVideoVolume;
    this.touchResult=0;
    this.bodyPosition="";

    this._videoElement=videoElement;
    this._parentElement=videoElement.parentElement;
    this._element=null;
    this._toastText=null;
    this.createDom(this._parentElement);
    this.listenDom();
};

TouchGesture.VideoGesture.prototype.createDom=function(parentElement){
    // var fragment = document.createDocumentFragment();
    var toastDiv=document.createElement("div");
    var toastText=document.createElement("span");
    toastDiv.appendChild(toastText);
    toastDiv.classList.add("TouchGesture_Toast");
    toastDiv.style.display="none";
    toastText.classList.add("TouchGesture_ToastText");
    // fragment.appendChild(toastDiv);

    this._parentElement=parentElement;
    // parentElement.insertBefore(fragment, this._videoElement);
    parentElement.appendChild(toastDiv);
    this._element=toastDiv;
    this._toastText=toastText;
    this._videoElement.classList.add("TouchGesture_Video");
    // this.adjustLayout();
};

TouchGesture.VideoGesture.prototype.listenDom=function(){
    var self=this;
    var touchStartHandler=this.onTouchStart.bind(this);
    var touchEndHandler=this.onTouchEnd.bind(this);
    var touchMoveHandler=this.onTouchMove.bind(this);
    var targetElement=this._videoElement;
    var topest=false;
    while(!topest){
        var temp=targetElement.parentElement;
        var size1=targetElement.offsetWidth*targetElement.offsetHeight;
        var size2=temp.offsetWidth*temp.offsetHeight;
        if(temp.offsetWidth>=targetElement.offsetWidth&&temp.offsetHeight>=targetElement.offsetHeight&&size2/size1<=1.1){
            targetElement=temp;
        }else{
            topest=true;
        }
    }
    targetElement.addEventListener("touchstart",touchStartHandler,false);
    targetElement.addEventListener("touchend",touchEndHandler,false);
    targetElement.addEventListener("touchmove",touchMoveHandler,false);
};

TouchGesture.VideoGesture.prototype.onTouchStart=function(e){
    this.forbidScroll();
    // console.log(e);
    this.adjustLayout();
    // console.log(e);
    if(e.touches.length==1){
        this.touchStartPt=e.touches[0];
    }else{
        this.cancelTouch();
    }
};

TouchGesture.VideoGesture.prototype.onTouchMove=function(e){
    var videoElement=this._videoElement;
    if(this.touchStartPt==null)
        return;
    if(e.touches.length==1){
        var touchPt=e.touches[0];
        delX=touchPt.clientX-this.touchStartPt.clientX;
        delY=touchPt.clientY-this.touchStartPt.clientY;
        if(this.sweepDir==0){
            var radius=Math.sqrt(delX*delX+delY*delY);
            var w=videoElement.offsetWidth,h=videoElement.offsetHeight;
            var judge=Math.sqrt(w*w+h*h)/30;
            if(radius>judge){
                if(Math.abs(delX)>Math.abs(delY)){
                    if(delX>0)
                        this.sweepDir=4;
                    else
                        this.sweepDir=3;
                }else{
                    if(delY>0)
                        this.sweepDir=2;
                    else
                        this.sweepDir=1;

                }
                // console.log("get sweep dir:"+this.sweepDir);
                this.startTouchVideoTime=Math.floor(videoElement.currentTime);
                this.startTouchVideoVolume=videoElement.volume;
            }
        }else if(this.sweepDir==3||this.sweepDir==4){
            delX=touchPt.clientX-this.touchStartPt.clientX;
            this.touchResult=Math.floor((delX/videoElement.offsetWidth)*200);
            if(this.touchResult+this.startTouchVideoTime<0)
                this.touchResult=-this.startTouchVideoTime;
            if(this.touchResult+this.startTouchVideoTime>videoElement.duration){
                this.touchResult=Math.floor(videoElement.duration-this.startTouchVideoTime)-1;
            }
            if( (this.sweepDir==3&&this.touchResult>0)||(this.sweepDir==4&&this.touchResult<0)){
                this.touchResult=0;
            }
            if(this.touchResult>0)
                this.setToast(seconds2TimeStr(this.startTouchVideoTime)+" +"+this.touchResult+"s");
            else
                this.setToast(seconds2TimeStr(this.startTouchVideoTime)+" "+this.touchResult+"s");
            // console.log(videoElement);
        }else if(this.sweepDir==1||this.sweepDir==2){
            var plus=-delY/videoElement.offsetHeight*4;
            this.touchResult=this.startTouchVideoVolume+plus;
            if(this.touchResult<0) this.touchResult=0;
            else if(this.touchResult>1) this.touchResult=1;
            videoElement.volume =this.touchResult;
            this.setToast(Math.floor(this.touchResult*100)+"%");

        }


        //console.log("delx:"+delX);
    }else{
        this.cancelTouch();
    }
};


TouchGesture.VideoGesture.prototype.onTouchEnd=function(e){
    videoElement=this._videoElement;
    this.touchStartPt=null;
    if(this.touchResult!=0){
        if(this.sweepDir==3||this.sweepDir==4){
            var res=this.startTouchVideoTime+this.touchResult;
            // console.log(videoElement.currentTime);
            // console.log("touch end:"+res);
            videoElement.currentTime=res;
            this.hideToast();
            // videoElement.play();
        }else if(this.sweepDir==1||this.sweepDir==2){
            this.hideToast();
            // videoElement.play();
        }
    }else{
        this.cancelTouch();
    }
    this.sweepDir=0;
    this.permitcroll();
};


TouchGesture.VideoGesture.prototype.adjustLayout=function(){
    if(document.fullscreenElement!=null){
        if(document.fullscreenElement.tagName=="HTML"&&this._parentElement.tagName!="BODY"){
            this._parentElement.removeChild(this._element);
            this.createDom(document.body);
        }else if(document.fullscreenElement!=this._parentElement){
            this._parentElement.removeChild(this._element);
            // this._parentElement=document.fullscreenElement;
            this.createDom(document.fullscreenElement);
        }
    }else if(document.fullscreenElement==null&&this._parentElement!=this._videoElement.parentElement){
        this._parentElement.removeChild(this._element);
        this.createDom(this._videoElement.parentElement);
    }
    var videoTarget=this._videoElement;
    var vw=videoTarget.offsetWidth,vh=videoTarget.offsetHeight;
    var w=vw/5;
    var h=vh/8;
    var x=(vw-w)/2+videoTarget.offsetLeft;
    var y=(vh-h)/2+videoTarget.offsetTop;
    // console.log("w:"+w," h:"+h+" x:"+x+" y:"+y);
    this._element.style.width=w+"px";
    this._element.style.height=h+"px";
    this._element.style.left=x+"px";
    this._element.style.top=y+"px";
    // this._element.style.display="block";
    var fontsize=h/3;
    this._toastText.style.fontSize=fontsize+"px";
    this._toastText.style.marginTop=(h-fontsize)/2+"px";
    this._element.style.display="none";
    this._element.style.borderRadius = w/10 +"px";
}

TouchGesture.VideoGesture.prototype.setToast=function(str){
    // this._element.style.opacity=0.75;
    this._element.style.display="block";
    this._element.classList.remove("fadeout");
    this._toastText.innerHTML=str;
}

TouchGesture.VideoGesture.prototype.cancelTouch=function(){
    this.touchStartPt=null;
    this.hideToast();
}

TouchGesture.VideoGesture.prototype.hideToast=function(){
    var element=this._element;
    setTimeout(function(){
        element.classList.add("fadeout");
    },500);
    // setTimeout(function(){
    //     element.style.opacity=0;
    //     element.classList.remove("fadeout");
    // },1500);
}

TouchGesture.VideoGesture.insertDom=function(dom){
    var videoTags = dom.getElementsByTagName('video');
    // console.log(dom);
    Array.prototype.forEach.call(videoTags, function(videoTag) {
        if (!videoTag.getAttribute('TouchGesture_Video')) {
          videoTag.setAttribute('TouchGesture_Video', true);
          new TouchGesture.VideoGesture(videoTag);
          console.log("insert node");
        }
    });
};

TouchGesture.VideoGesture.insertAll=function(){
    // var self=this;
    TouchGesture.VideoGesture.insertDom(document);
    // var iframes=document.getElementsByTagName("iframe");
    // Array.prototype.forEach.call(iframes, function(iframeTag) {
    //     // console.log(iframeTag.contentWindow.document.getElementsByTagName("video"));
    //     // iframeTag
    //     TouchGesture.VideoGesture.insertDom(iframeTag.contentWindow.document);
    // });
};

TouchGesture.VideoGesture.prototype.forbidScroll=function(){
    // var bodies=document.getElementsByTagName("body");
    // Array.prototype.forEach.call(bodies, function(body) {
    //     body.style.position="fixed";
    // });
    TouchGesture.forbidScroll=true;
}
TouchGesture.VideoGesture.prototype.permitcroll=function(){
    // var bodies=document.getElementsByTagName("body");
    // Array.prototype.forEach.call(bodies, function(body) {
    //     body.style.position="relative";
    // });
    TouchGesture.forbidScroll=false;
}




function seconds2TimeStr(secs){
    var hour=parseInt(secs/3600);
    var min=parseInt(secs/60)-60*hour;
    var sec=secs%60;
    var ret="";
    if(hour>0){
        ret+=hour+":";
    }
    ret+=(min < 10? '0' + min : min) + ':' + (sec < 10? '0' + sec : sec);
    return ret;
}



(function() {
    'use strict';
    // Your code here...
    // console.log('hello Greasemonkey');
    GM_addStyle('div.TouchGesture_Toast{  width: 200px;  height: 100px;  opacity: 0.75;  position: absolute;  z-index: 999999;  top: 100px;  left: 200px;  background-color: black; } ');
    GM_addStyle('span.TouchGesture_ToastText{  position: absolute;  left: 0;  right: 0;  text-align: center;  color: white; }  div.TouchGesture_Toast.fadeout{  -webkit-transition: all 1.5s;       -moz-transition: all 1.5s;       -ms-transition: all 1.5s;       -o-transition: all 1.5s;       transition: all 1.5s;       opacity: 0;      }');
    GM_addStyle('div.TouchGesture_Toast.fadeout{  -webkit-transition: all 1.5s; -moz-transition: all 1.5s; -ms-transition: all 1.5s; -o-transition: all 1.5s; transition: all 1.5s; opacity: 0;}');


    document.addEventListener('touchmove', function(e){
        if(e.srcElement.tagName!="VIDEO"){
            TouchGesture.forbidScroll=false;
        }
        if(TouchGesture.forbidScroll==true){
            e.preventDefault && e.preventDefault();
            e.returnValue=false;
            e.stopPropagation && e.stopPropagation();
            return false;
        }
        return true;
    },{ passive: false });

    TouchGesture.VideoGesture.insertAll();
    setInterval(TouchGesture.VideoGesture.insertAll, 1000);
})();
