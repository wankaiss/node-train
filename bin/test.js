(function () {

	window.playerInitArray = [];

	setInterval(function () {
		var pInit = playerInitArray[0];
		playerInitArray.splice(0, 1);

		if (pInit != null) {
			PlayerStarter.createPlayer($("#" + pInit.id), pInit.options, pInit.callback);
		}
	}, 1000);

	function addPinit(pInit) {

		for (var i = 0; i < window.playerInitArray.length; i++) {
			if (window.playerInitArray[i].id == pInit.id) {
				playerInitArray.splice(i, 1);
				i--;
			}
		}
		playerInitArray.push(pInit);
	}

	$.fn.Ableplayer = function (options, callback) {
		//默认使用vjs播放  --紧急修补
		//options.defaltplayertype=PlayerStarter.playerTypes["vjs"];

		var pInit = {
			id: $(this).attr("id"),
			options: options,
			callback: callback
		};

		// playerInitArray.push(pInit);
		addPinit(pInit);
	};

	//播放器启动器
	var PlayerStarter = {
		globalOptions: { //默认参数
			// image:"http://image.zhihuishu.com/testzhs/zhsmanage/image/201606/6e342812cf2d4766900aaf9335a1f87d.jpg",
			image: "", //默认封面图片
			schoolIp: false, //是否是校内加速IP
			defaltplayertype: 1, //默认的播放器类型 自动
			debugMode: false, //debug模式
			autostart: true, //自动播放
			control: { //组件的开关
				controlBar: 1, //-1:不显示  0:显示不消失   1:显示动态消失
				rateBtn: true, //变速按钮
				trackBtn: true, //字幕按钮
				definiBtn: true, //清晰度按钮
				volumeBtn: true, //音量按钮
				fullBtn: true, // 全屏按钮
				bigPlayerBtn: true, //大播放按钮
				playTime: true, //进度时间
				errorBar: true, //错误提示
				danmuBtn: false, //弹幕开关
				nextBtn: false //下一节开关
			}
		},
		playerTypes: {
			"vjs": 3,
			"letv": 2,
			"auto": 1
		}, //播放器类型
		defaultPlayerType: "1", //默认的播放器类型
		currentPlayerType: "-1", //当前使用的播放器类型
		currentFullPlayer: "", //当前最大化的播放器
		playerArray: [], //播放器实例数组
		createPlayer: function ($container, options, callback) {

			$container.addClass("able-player-container");
			$container.css("background-color", "#000");
			this.listener();

			try {

				ablePlayerX($container.attr("id")).dispose();

			} catch (e) {}

			options = $.extend({}, this.globalOptions, options); //融合options
			if (options.image == null || options.image == "") {
				options.image = "about:blank";
			}

			PlayerUtil.debugMode = options.debugMode; //是否为debug模式

			PlayerUtil.log("视频ID:" + options.id);
			PlayerUtil.log("视频SRC:" + options.src);

			//将该播放器信息放在管理器中
			var obj = {
				"id": $container.attr("id"),
				"uuid": uuid.v4(),
				"options": PlayerUtil.clone(options),
				"defOptions": PlayerUtil.clone(options),
				"callback": callback,
				"times": {
					"firstLoadTime": 0,
					"initEndTime": 0,
					"creatTime": 0,
					"waitingTime": 0
				},
				"courseInfo": {
					"schoolId": "",
					"schoolName": "",
					"classId": "",
					"className": "",
					"courseId": "",
					"courseName": "",
					"LiveCourseId": ""
				}
			};
			this.playerArray.push(obj);

			obj.options = this.initControls($container, obj.options);

			if (!PlayerUtil.supportVideo()) {
				if (!PlayerUtil.hasFlash()) {
					PlayerStarter.showError(obj, "04", "无法播放,请安装flash插件!"); //网络异常或视频文件无法播放
					return;
				}
			}

			//新监控
			// MonitorUtil.init(obj);

			PlayerUtil.log("加载videoJS播放器");
			$container.videojsPlayer(obj);

		},
		showError: function (obj, code, str) {

			var html = "";
			if (obj.options.control.errorBar) {
				html += '<div class="ablePlayerError">';
				html += '<div class="ablePlayerErrorCode">代码:' + code + '</div>';
				html += '<div class="ablePlayerErrorText">' + str + '</div>';
				html += '</div>';
			} else {
				html += '<div class="ablePlayerErrorText2">' + str + '(代码:' + code + ')</div>';
			}

			// 错误日志记录
			if (code == "04" || code == "03") {
				MonitorUtil.errorLog(obj);
			}

			if (typeof(obj.$videoArea) == "undefined") {
				var $container = $("#" + obj.id);
				$container.html("");
				$container.css("position", "relative");
				$container.append(html);
			} else {
				obj.$videoArea.append(html);
			}
		},
		//监测全屏切换 进度条同步
		lisFull_progressBar: function (obj) {
			obj.player.sdk.getVideoTime() = parseInt($(".vjs-duration-display").clone().children().remove().end().text().trim());
			setTimeout(function () {
				if (obj.currentPlayerType == 2) {
					var duration = parseInt(obj.player.sdk.getVideoSetting().duration);
					var currentTime = parseInt(obj.player.sdk.getVideoTime());
					var totalLength = $("#" + obj.id).width();
					var barLeft = (currentTime / duration) * (totalLength - $("#" + obj.id + " .progressBall").width());
					$("#" + obj.id + " .progressBall").css("left", barLeft + "px");
					$("#" + obj.id + " .progressBall").css("margin-left", "0px");
				} else {
					var duration = parseInt(obj.player.duration());
					var currentTime = parseInt(obj.player.currentTime());
					var totalLength = $("#" + obj.id).width();
					var barLeft = (currentTime / duration) * (totalLength - $("#" + obj.id + " .progressBall").width());
					$("#" + obj.id + " .progressBall").css("left", barLeft + "px");
				}
			}, 200);
		},
		//监听
		listener: function () {

			this.listenerFullscreenchange();
			this.listenerEsc();

		},
		//ESC 的监听
		listenerEsc: function () {
			var _this = this;

			if (window.isIE8 || window.isIE9 || window.isIE10) {

				$(document).keyup(function (event) {
					if (event.keyCode == 27) {
						//退出全屏
						_this.exitFullPlay();
					}
				});
			}
		},
		//退出全屏的监听
		listenerFullscreenchange: function (obj) {

			var _this = this;
			if (screenfull.enabled) {
				$(document).on(screenfull.raw.fullscreenchange, function () {
					if (!screenfull.isFullscreen) {
						//退出全屏
						_this.exitFullPlay();
					} else {
						//进入全屏
					}
				});
			}

		},
		get: function (id) { //根据id获取播放器列表中的对象

			for (var i = 0; i < this.playerArray.length; i++) {
				var current = this.playerArray[i];
				if (current.id == id) {
					return current;
				}
			}
			return null;
		},
		del: function (id) { //根据id获取播放器列表中的对象

			for (var i = 0; i < this.playerArray.length; i++) {
				var current = this.playerArray[i];
				if (current.id == id) {
					this.playerArray.splice(i, 1);
				}
			}
		},
		//初始化相关参数
		initOptions: function ($container, options) {

			// console.log("options.debugMode"+options.debugMode)

			// PlayerUtil.debugMode=options.debugMode;//是否为debug模式

			//options=$.extend(this.globalOptions,options);//融合options

			// return this.initControls($container,options);
		},
		//根据容器大小,判断控制按钮是否显示
		initControls: function ($container, options) {

			var defOptions = PlayerStarter.get($container.attr("id")).defOptions;

			if ($container.width() < 575) { //如果播放器的宽度小于575 隐藏变速,字幕,清晰度按钮
				options.control.rateBtn = false;
				options.control.trackBtn = false;
				options.control.definiBtn = false;
				options.control.danmuBtn = false;
			} else {
				options.control.rateBtn = true;
				options.control.trackBtn = true;
				options.control.definiBtn = true;
				if (defOptions.control.danmuBtn) {
					options.control.danmuBtn = true;
				}
				// options.control.definiBtn=false;
			}
			var tempvolumeBtn = options.control.volumeBtn;
			if ($container.width() < 335) { //如果播放器的宽度小于335 隐藏音量按钮
				options.control.volumeBtn = false;
			} else {
				// if (options.control.volumeBtn) {
				options.control.volumeBtn = true;
			}
			// }
			if (tempvolumeBtn == false) {
				options.control.volumeBtn = false;
			}
			if ($container.width() < 200) { //如果播放器的宽度小于200 隐藏全屏按钮
				options.control.fullBtn = false;
				options.control.playTime = false;
			} else {
				options.control.fullBtn = true;
				options.control.playTime = true;
			}

			if ($container.height() < 200) { //如果播放器的高度小于200 隐藏大按钮
				options.control.bigPlayerBtn = false;
			} else {
				options.control.bigPlayerBtn = true;
			}

			if (options.mp3Mode) {
				$container.height(40);
				options.control.rateBtn = false;
				options.control.trackBtn = false;
				options.control.definiBtn = false;
				options.control.bigPlayerBtn = false;
				options.control.fullBtn = false;
				options.control.danmuBtn = false;
				options.control.controlBar = 0;
			}

			if ($container.height() < 140 || $container.width() < 200) { //隐藏错误提示
				options.control.errorBar = false;
			} else {
				options.control.errorBar = true;
			}

			//如果视频ID为空,则使用VJS播放器,播放options.src,隐藏字幕和清晰度
			var exp = options.id;
			if (!exp || typeof(exp) == "undefined") {
				options.defaltplayertype = PlayerStarter.playerTypes["vjs"];
				options.control.trackBtn = false;
				options.control.definiBtn = false;
			}

			return options;

		},
		//重置 控制按钮的显示状态
		resetControls: function (obj) {

			var containerId = obj.id;
			var $container = $("#" + containerId);
			var options = obj.options;

			options = this.initControls($container, obj.options);

			var $speedBox = $("#" + containerId + " .speedBox");
			if (options.control.rateBtn) {
				$speedBox.show();
			} else {
				$speedBox.hide();
			}

			var $fullScreen = $("#" + containerId + " .fullScreen");
			if (options.control.fullBtn) {
				$fullScreen.show();
			} else {
				$fullScreen.hide();
			}

			var $notfullScreen = $("#" + containerId + " .notFullScreen");
			if (options.control.fullBtn) {
				$notfullScreen.show();
			} else {
				$notfullScreen.hide();
			}

			var $volumeBox = $("#" + containerId + " .volumeBox");
			if (options.control.volumeBtn) {
				$volumeBox.show();
			} else {
				$volumeBox.hide();
			}

			var $definiBox = $("#" + containerId + " .definiBox");
			if (obj.options.control.definiBtn) {
				$definiBox.show();
			} else {
				$definiBox.hide();
			}

			var $commonBoxDef = $("#" + containerId + " .commonBoxDef");
			var $commonBox = $("#" + containerId + " .commonBox");
			if (obj.options.control.trackBtn) {

				if ($.trim($commonBox.children().html()) != "") {
					$commonBox.show();
				}

				if ($.trim($commonBoxDef.children().html()) != "") {
					$commonBoxDef.show();
				}
			} else {
				$commonBoxDef.hide();
				$commonBox.hide();
			}

			var $danmu = $("#" + containerId + " #danmu");
			if (options.control.danmuBtn) {
				$danmu.show();
			} else {
				$danmu.hide();
			}

			// var $bigPlayerBtn=$("#"+containerId+" .bigPlayButton");
			// if(options.control.bigPlayerBtn){
			//     $bigPlayerBtn.show();
			// }else{
			//     $bigPlayerBtn.hide();
			// }

			var $playTime = $("#" + containerId + " .nPlayTime");
			if (options.control.playTime) {
				$playTime.show();
			} else {
				$playTime.hide();
			}

		},
		autoLoad: function (obj) {

			var _this = this;

			$.ajax({
				url: "http://file.livecourse.com/ipserver/serverVideos.json",
				dataType: "jsonp",
				jsonp: "callback",
				jsonpCallback: "videos",
				async: false,
				success: function (ips) {
					_this.checkIp(obj, ips);
				},
				error: function () {
					_this.autoLoad(obj);
					PlayerUtil.log("加载校内IP列表失败");
				}
			});
		},
		//检查自己的IP是否是校内IP,根据情况初始化播放器
		checkIp: function (obj, ips) {

			var $container = $("#" + obj.id);

			var _this = this;
			$.ajax({
				url: "http://video.base.zhihuishu.com/video/getClientIp?jsonpCallBack=?",
				dataType: "jsonp",
				jsonp: "jsonp",
				async: true,
				cache: false,
				success: function (data) {

					var ip = data["clientIp"];

					var bool = _this.checkIsInSchoolIps(ip, ips);

					// bool=true;//伪造为校内IP  线上应注释该行

					// if(bool){
					obj.options.schoolIp = true;
					PlayerUtil.log("校内IP加载vjs播放器");
					$container.videojsPlayer(obj);
					// }else{
					//     obj.options.schoolIp=false;
					//     PlayerUtil.log("非校内IP加载乐视播放器");
					//     $container.letvPlayer(obj);
					// }
				}

			});
		},
		checkIsInSchoolIps: function (ip, ips) { //判断IP是否在指定的IP段中
			var status = false;
			if (ips != "") {
				$.each(ips, function (i, ipjson) {

					var ipSection = ipjson["schoolIps"];
					var REGX_IP = /^(([01]?[\d]{1,2})|(2[0-4][\d])|(25[0-5]))(\.(([01]?[\d]{1,2})|(2[0-4][\d])|(25[0-5]))){3}$/;
					if (!REGX_IP.test(ip)) {
						return false;
					}
					var idx = ipSection.indexOf('-');
					var qian = pint(ipSection.substring(0, idx).split("."));
					var hou = pint(ipSection.substring(idx + 1).split("."));
					var now = pint(ip.split("."));

					function pint(array) {
						for (var i = 0; i < array.length; i++) {
							array[i] = parseInt(array[i]);
						}
						return array;
					}

					for (var i = 0; i < 3; i++) {

						var bo = (now[i] >= qian[i] && now[i] <= hou[i]);
						if (!bo) {
							return true;
						}
					}

					if (qian[2] == hou[2]) {
						if (now[3] >= qian[3] && now[3] <= hou[3]) {
							status = true;
							return false;
						}
					} else {
						if (now[2] == qian[2]) {
							if (now[3] >= qian[3]) {
								status = true;
								return false;
							}
						} else if (now[2] == hou[2]) {
							if (now[3] <= hou[3]) {
								status = true;
								return false;
							}
						} else {
							status = true;
							return false;
						}
					}

				});
			}
			if (status) {
				PlayerUtil.log("检测到校内IP");
			}
			return status;
		},
		//进入全屏播放
		requestFullPlay: function (obj) {

			var containerId = obj.id;
			var $container = $("#" + containerId);
			var options = obj.options;
			options.isFullscreen = 1;
			this.currentFullPlayer = obj;

			obj.defaultHeight = $container.height();
			obj.defaultWidth = $container.width();

			// 进入全屏
			if (screenfull.enabled) {
				screenfull.request($container[0]);
			}

			//禁用滚动条
			window.docOrigOverflow = document.documentElement.style.overflow;
			document.documentElement.style.overflow = "hidden";

			//增加全屏样式
			$container.addClass("ableVideoPlayer-full");
			$container.css("z-index", "9999");
			$container.children("div :eq(0)").css("z-index", "9999");

			//全屏按钮样式
			$("#" + containerId + " .fullScreen").attr("class", "notFullScreen");
			if (!window.isIE8) {
				// obj.cm.init();//重置弹幕出现位置
			}

			//字幕
			var $commonBoxDef = $("#" + containerId + " .commonBoxDef");
			var $commonBox = $("#" + containerId + " .commonBox");

			//全屏状态下控件显示//////////////////////////////////////////////////////////
			//字幕
			try {
				if ($.trim($commonBox.children().html()) != "") {
					$commonBox.show();
				}

				if ($.trim($commonBoxDef.children().html()) != "") {
					$commonBoxDef.show();
				}
			} catch (e) {
				PlayerUtil.log("进入全屏调整字幕按钮失败.");
			}

			//弹幕
			// if(obj.defOptions.control.danmuBtn){
			//     $("#"+containerId+" #danmu").show();
			// }

			// $("#"+containerId+" .speedBox").show();
			// $("#"+containerId+" .volumeBox").show();
			// $("#"+containerId+" .definiBox").show();
			// $("#"+containerId+" .fullScreen").show();

			this.lisFull_progressBar(obj);
			this.ieFullPlayer(obj);

			PlayerStarter.resetControls(obj);

		},
		exitFullPlay: function () { //退出全屏

			if (this.currentFullPlayer == null || this.currentFullPlayer == "") {
				return;
			}

			var obj = this.currentFullPlayer;
			var containerId = obj.id;
			var $container = $("#" + containerId);
			var options = obj.options;
			if (options.isFullscreen != 0 && !screenfull.isFullscreen) {
				MonitorUtil.saveAction(this.currentFullPlayer, "exitFull");
			}
			options.isFullscreen = 0;

			//如果没有退出全屏则退出全屏
			if (screenfull.enabled) {
				if (screenfull.isFullscreen) {
					MonitorUtil.saveAction(this.currentFullPlayer, "exitFull");
					screenfull.exit();
				}
			}

			//删除全屏样式
			$container.removeClass("ableVideoPlayer-full");
			$container.css("z-index", "");
			$container.children("div :eq(0)").css("z-index", "");

			document.documentElement.style.overflow = window.docOrigOverflow;

			$("#" + containerId + " .notFullScreen").attr("class", "fullScreen");

			$container.height(obj.defaultHeight);
			$container.width(obj.defaultWidth);
			if (!window.isIE8) {
				// obj.cm.init();
			}

			//复原控件原有状态
			// if(!options.control.rateBtn){
			//     $("#"+obj.id+" .speedBox").hide();
			// }

			// if(!options.control.volumeBtn){
			//     $("#"+obj.id+" .volumeBox").hide();
			// }

			// if(!options.control.trackBtn){
			//     $("#"+obj.id+" .commonBox").hide();
			// }

			// if(!obj.options.control.definiBtn){
			//     $("#"+obj.id+" .definiBox").hide();
			// }

			// if(!obj.options.control.fullBtn){
			//     $("#"+obj.id+" .fullScreen").hide();
			// }

			// if(!obj.options.control.danmuBtn){
			//     $("#"+obj.id+" #danmu").hide();
			// }

			this.lisFull_progressBar(obj);
			// 退出全屏后给回调
			var callback = obj.callback;
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onExitFullScreen)) {
				callback.onExitFullScreen();
			}

			this.ieExitPlayer(obj);

			PlayerStarter.resetControls(obj);

		},
		ieFullPlayer: function (obj) {

			if (window.isIE8 || window.isIE9 || window.isIE10) {

				var containerId = obj.id;
				var $container = $("#" + containerId);
				$("body").css("visibility", "hidden");
				$container.css("visibility", "visible");

			}

		},
		ieExitPlayer: function (obj) {
			if (window.isIE8 || window.isIE9 || window.isIE10) {
				$("body").css("visibility", "visible");
			}
		}
	};
	window.PlayerStarter = PlayerStarter;
})();
(function () {

	//对外提供API
	var ablePlayerX = function (containerId) {

		try {

			var obj = PlayerStarter.get(containerId);

			// if(obj.currentPlayerType==PlayerStarter.playerTypes["vjs"]){
			return new vjsAPI(obj);

			// }else if(obj.currentPlayerType==PlayerStarter.playerTypes["letv"]){
			//     return new letvAPI(obj);

			// }else{
			//     PlayerUtil.log("调用API时无法确定播放器类型!");
			// }

		} catch (e) {
			PlayerUtil.log("ablePlayerX 获取播放器API对象失败,获取空API对象,containerId:" + containerId);
			return new errorAPI(containerId);
		}

	};

	function errorAPI(containerId) {
		this.id = containerId;
	}

	errorAPI.prototype = {

		seek: function (second) {},
		setFullscreen: function (bool) {},
		play: function () {},
		pause: function () {},
		getDuration: function () {
			// console.log("getDuration");
		},
		getPosition: function () {},
		addCourseInfo: function () {},
		dispose: function () {},
		getFullStatus: function () {},
		exitFullPlay: function () {},
		resize: function (width, height) {
			try {
				var $container = $("#" + this.id);
				$container.width(width);
				$container.height(height);
			} catch (e) {
				PlayerUtil.log("errorAPI改变播放器大小失败!");
			}
		},
		insertPopup: function (htmlstr) {},
		removePopup: function () {},
		sendDanmu: function () {}

	};

	window.ablePlayerX = ablePlayerX;
})();
(function () {

	var loginUserInfo = "";
	var userId = "";
	var userName = "";
	var realName = "";
	var clientIp = "";
	var pro = "";
	var city = "";
	var addr = "";
	try {
		loginUserInfo = jQuery.parseJSON($.cookie('CASLOGC'));

		if (loginUserInfo.username != undefined
			 && loginUserInfo.userId != undefined
			 && loginUserInfo.realName != undefined) {
			userId = loginUserInfo.userId;
			userName = loginUserInfo.username;
			realName = loginUserInfo.realName;
		}

	} catch (e) {}

	var intervals = []; //心跳定时器对象

	getClientIp();

	var MonitorUtil = {

		init: function (obj) {

			try {
				//10.12日早,暂时去掉监控上报
				// initHttp(obj);
				// heartbeatHttp(obj);
			} catch (e) {}
		},
		videoLogBase: function (obj) {
			//新版监控
			setTimeout(function () {
				try {
					newmonitorHttp(obj);
				} catch (e) {
					PlayerUtil.log("日志添加失败");
				}
			}, 1000);
		},
		saveAction: function (obj, action, oldTime, currentTime) {
			try {
				saveAction(obj, action, oldTime, currentTime);
			} catch (e) {
				PlayerUtil.log("日志添加失败", e);
			}
		},
		errorLog: function (obj) {
			try {
				errorLogHttp(obj);
			} catch (e) {}
		}
	};
	window.MonitorUtil = MonitorUtil;

	var initHttp = function (obj) {

		var params = {
			"msgType": "0",
			"appName": "pcVideoPlayer",
			"videoID": obj.options.id,
			"UUID": obj.uuid,
			"clientIp": clientIp
		};
		doJSONP(params);
	};

	var heartbeatHttp = function (obj) {

		var obj = {
			uuid: obj.uuid,
			timer: setInterval(function () {

				if (getObjByUUID(obj.uuid) != null) {
					var params = {
						"msgType": "1",
						"UUID": obj.uuid
					};
					doJSONP(params);
				} else {
					window.clearInterval(obj.timer);
				}
			}, 30000)
		};

		intervals.push(obj);

	};

	var newmonitorHttp = function (obj) {
		getClientIp();
		var videolog = "";
		videolog += "[" + obj.options.id + "," + new Date().getTime();
		if (loginUserInfo.userId != null && loginUserInfo.userId != "undefined") {
			videolog += "," + loginUserInfo.userId;
		} else {
			videolog += ",";
		}
		if (obj.courseInfo.courseId != null || obj.courseInfo.courseId != "undefined") {
			videolog += "," + obj.courseInfo.courseId;
		} else {
			videolog += ",";
		}
		//学校ID null
		videolog += ",";
		//module null
		videolog += ",";
		//appType PC、 appPlatform null、 appVersion null、 deviceNumber null、iemi null 、 notword null
		videolog += ",PC,,,,,";
		//addr IP
		videolog += "," + clientIp;
		//brand null、model null、 systemVersion null、
		videolog += ",,,";
		// channel
		for (var i = 0; i < obj.options.sourceSrc.lines.length; i++) {
			if (obj.options.sourceSrc.lines[i].lineDefault) {
				videolog += "," + obj.options.sourceSrc.lines[i].lineID;
			}
		}
		//起播耗时 null  接口耗时 null
		var startPlayElapsed = 0;
		if (obj.times.initEndTime > 0) {
			startPlayElapsed = obj.times.initEndTime - obj.times.creatTime
		}
		videolog += "," + startPlayElapsed;
		var apiElapsed = 0
			if (obj.times.firstLoadTime > 0) {
				apiElapsed = obj.times.firstLoadTime - obj.times.creatTime
			}
			videolog += "," + apiElapsed;

		videolog += "," + pro + "," + city + "," + addr;
		//uuid
		videolog += "," + obj.uuid + "]";

		PlayerUtil.log(videolog);
		savaVideoCollect(videolog)

	}

	var savaVideoCollect = function (content) {
		var data = {
			"c": content
		};
		$.ajax({
			url: "http://collector.zhihuishu.com/video/web/collect",
			type: "POST",
			dataType: "json",
			contentType: "application/json",
			data: JSON.stringify(data),
			success: function (result) {
				// PlayerUtil.log(result);
			},
			error: function () {}
		});
	}

	var saveAction = function (obj, action, oldTime, currentTime) {
		var info = "";
		if ("play" == action || "pause" == action || "exit" == action || "full" == action || "exitFull" == action) {
			info = "[" + action + "," + new Date().getTime() + "," + parseInt(obj.player.currentTime()) + ",,,,,,," + obj.uuid + "]|";
		}
		if ("changeRate" == action) {
			info = "[" + action + "," + new Date().getTime() + "," + parseInt(obj.player.currentTime()) + ",,,,,," + obj.player.playbackRate() + "," + obj.uuid + "]|";
		}
		if ("changeLine" == action) {
			info = "[" + action + "," + new Date().getTime() + "," + parseInt(obj.options.seek) + ",,,,,," + obj.options.lineID + "," + obj.uuid + "]|";
		}
		if ("drag" == action) {
			info = "[" + action + "," + new Date().getTime() + "," + parseInt(oldTime) + "," + parseInt(oldTime) + "," + parseInt(currentTime) + ",,,,," + obj.uuid + "]|";
		}
		if ("kadun" == action) {
			info = "[" + action + "," + new Date().getTime() + "," + parseInt(obj.player.currentTime()) + ",,,,,," + parseInt(obj.options.kadun) + "," + obj.uuid + "]|";
		}
		if (obj.options.videoLog) {
			obj.options.videoLog = obj.options.videoLog + info;
		} else {
			obj.options.videoLog = info;
		}
	}

	var errorLogHttp = function (obj) {
		var lineName = "校内";
		if (obj.options.chooseLine == 0) {
			lineName = "高清";
		}
		if (obj.options.chooseLine == 1) {
			lineName = "流畅";
		}
		if (obj.options.chooseLine == 2) {
			lineName = "校内";
		}

		var json = {
			"videoId": obj.options.id,
			"module": "VIDEO_ERROR_LOG",
			"uuid": obj.uuid,
			"lineName": lineName,
			"videoStorage": obj.options.src
		};
		if (userId != null && userId != "" && userId != "undefined") {
			json.userId = userId;
		}
		var data = {
			"data": [json]
		};

		$.ajax({
			url: "http://collector.zhihuishu.com/public/collect",
			type: "POST",
			data: {
				"json": JSON.stringify(data)
			},
			success: function (result) {
				// PlayerUtil.log("监控数据发送成功!")
				// if(success!=null&&$.isFunction(success)){
				//     success(result);
				// }
			},
			error: function () {
				// PlayerUtil.log("监控数据发送失败!")
				// if(error!=null&&$.isFunction(error)){
				//     error();
				// }

			}
		});
	}

	var getObjByUUID = function (UUID) {
		for (var i = 0; i < PlayerStarter.playerArray.length; i++) {
			var obj = PlayerStarter.playerArray[i];
			if (obj.uuid == UUID) {
				return obj;
			}
		}
		return null;
	};

	var doJSONP = function (params, success, error) {

		var data = {
			queueName: "pcVideoPlayer",
			msg: JSON.stringify(params)
		};

		$.ajax({
			url: "http://jiankong.zhihuishu.com/dg/sendMsgGet",
			data: data,
			dataType: "jsonp",
			success: function (result) {
				// PlayerUtil.log("监控数据发送成功!")
				if (success != null && $.isFunction(success)) {
					success(result);
				}
			},
			error: function () {
				// PlayerUtil.log("监控数据发送失败!")
				if (error != null && $.isFunction(error)) {
					error();
				}

			}
		});

	};

	//每30秒上报一次
	setInterval(function () {
		// monitor();
		try {
			for (var i = 0; i < PlayerStarter.playerArray.length; i++) {
				var obj = PlayerStarter.playerArray[i];
				var c = obj.options.videoLog;
				if (c) {
					obj.options.videoLog = "";
					savaVideoCollect(c);
				}
				if (!obj.player.ended()) {
					var ce = "[continue," + new Date().getTime() + "," + parseInt(obj.player.currentTime()) + ",,,,,,," + obj.uuid + "]";
					savaVideoCollect(ce);
				}
			}
		} catch (e) {}
	}, 30000);

	//发送数据
	var sendData = function (data) {

		try {

			var params = {
				"d": data
			};

			$.ajax({
				url: "http://lc.zhihuishu.com/ht/video/p",
				data: params,
				dataType: "jsonp",
				success: function (result) {
					// PlayerUtil.log("监控数据发送成功!")
				},
				error: function () {
					// PlayerUtil.log("监控数据发送失败!")
				}
			});

		} catch (e) {}
	};

	//主方法
	var monitor = function () {

		try {

			for (var i = 0; i < PlayerStarter.playerArray.length; i++) {
				var obj = PlayerStarter.playerArray[i];
				// console.log("obj.times.creatTime:"+obj.times.creatTime)
				// console.log("obj.times.initEndTime:"+obj.times.initEndTime)
				// console.log("obj.times.firstLoadTime:"+obj.times.firstLoadTime)
				sendData(getData(obj));
			}

		} catch (e) {}

	};

	//获取本机IP
	function getClientIp() {

		/*try {

			$.ajax({
				url: "http://video.base.zhihuishu.com/video/getClientIp2?jsonpCallBack=?",
				dataType: "jsonp",
				jsonp: "jsonp",
				async: true,
				cache: false,
				success: function (data) {
					clientIp = data["clientIp"];
					pro = data["pro"];
					city = data["city"];
					addr = data["addr"];
				}
			});

		} catch (e) {}*/
		return "127.0.0.1";
		
	}

	//获取监控数据
	var getData = function (obj) {

		var api = "";
		if (obj.currentPlayerType == PlayerStarter.playerTypes["vjs"]) {
			api = new vjsAPI(obj);

		} else if (obj.currentPlayerType == PlayerStarter.playerTypes["letv"]) {
			api = new letvAPI(obj);

		} else {
			PlayerUtil.log("调用API时无法确定播放器类型!");
		}

		var data = {
			"t": new Date().getTime(),
			"i": obj.uuid,
			"a": {
				//视频ID
				"a1": obj.options.id,
				//课程ID
				"a2": obj.courseInfo.courseId,
				//课程名称
				"a2n": obj.courseInfo.courseName,
				//招生ID
				"a3": "",
				//招生名称
				"a3n": "",
				//章节ID
				"a4": "",
				//章节名称
				"a4n": "",
				//用户ID
				"a5": userId,
				//用户名
				"a5n": userName,
				//学校ID
				"a6": "",
				//学校名称
				"a6n": "",
				//客户IP
				"a7": clientIp,
				//播放器类型	{"vjs": 3,"letv": 2,"auto": 1}
				"a8": obj.currentPlayerType,
				//视频总时长	单位毫秒
				"a9": api.getDuration(),
				//终端分类
				"aa": 1,
				//终端类型
				"ab": 3,
				//终端信息
				"ac": ""
			},
			"b": {
				//视频ID
				"a1": obj.options.id,
				//播放器初始化时长	 :单位毫秒
				"b1": obj.times.initEndTime - obj.times.creatTime,
				//首次缓冲时长	 :单位毫秒
				"b2": obj.times.firstLoadTime - obj.times.creatTime,
				//缓冲总时长	 :单位毫秒
				"b3": 8000,
				//当前位置	 :单位毫秒
				"b4": api.getPosition(),
				//状态格式版本	1：第1版本的状态格式数据，按位代表属性
				"b5": 1,
				"b6": [{
						//t：6位当前时分秒数
						"t": 000000,
						//线路、初始化状态、播放状态、是否静音
						"s": "1232"
						//线路：数字代号;
						//初始化状态： 1 初始化中 2 初始化成功 3 初始化失败
						//播放状态  ： 1 空闲   2 缓冲  3 播放 4 暂停 5 完成
						//是否静音  ： 1 是   2 否
					}, {
						"t": 23592,
						"s": "1232"
					}
				]
			},
			"c": {}
		};
		return data;
	}

})();
(function (vjs) {

	var letvComponent = function (obj) {
		defaultComponent(obj);

		if (PlayerUtil.supportVideo()) { //如果不支持video标签 默认用flash false的API刚初始化时无法调用,所以延时
			ctrlComponent(obj);
		} else {
			setTimeout(function () {
				ctrlComponent(obj);
			}, 300);
		}

	};

	//默认项
	var defaultComponent = function (obj) {

		/**
		 * 设置播放器的默认层级
		 */
		// $("#"+obj.id).css("z-index","9999");
		// $("#"+obj.id).css("position","relative");
		// $("#"+obj.id).children().css("z-index","9999");

		$("#" + obj.id).children().addClass('able-player-skin');

		/**
		 * 屏蔽右键菜单的方法
		 */
		$("#" + obj.id).on('contextmenu', function () {
			return false;
		});

	};

	//控制组件
	var ctrlComponent = function (obj) {

		var $video = $("#" + obj.id).children();
		var $videoArea = $('<div class="videoArea" style="width: 100%;height: 100%;z-index:1;position: absolute" ></div>');
		var $ableControlBar = $('<div class="controlsBar" style="z-index: 2"></div>');
		$video.append($videoArea);
		$video.append($ableControlBar);

		obj.$video = $video;
		obj.$videoArea = $videoArea;
		obj.$ableControlBar = $ableControlBar;

		if (obj.options.mp3Mode) {
			$videoArea.css("backgroundColor", "#000");
		}

		initDefiniArea(obj); //清晰度选项区
		initProgress(obj); //进度条
		initPlayBtn(obj); //播放器按钮
		initTime(obj); //时间
		initRateBtn(obj); //速率
		initFull(obj); //全屏按钮
		initVolume(obj); //声音
		initDefini(obj); //清晰度
		initTrack(obj); //字幕
		initDanmu(obj); //弹幕功能
		active(obj);
		bindClick(obj);

	};

	//清晰度
	var initDefiniArea = function (obj) {

		var $video = obj.$video;
		var player = obj.player;
		var options = obj.options;

		var html = '<div class="definiArea"  style="z-index: 2" >';
		html += '<div class="definiHead"><span>清晰度</span><b class="defCloseBtn"></b></div>';
		html += '<div class="definiLines">';
		html += '<div class="line1"><span>线路一</span><b class="line1bq"></b><b class="line1gq"></b><b class="line1cq"></b></div>';
		html += '<div class="line2"><span>线路二</span><b class="line2cq"></b></div>';
		html += '</div>';
		html += '<div class="definiSpeedUp"><span>校内加速</span><b class="xiaonei"></b></div>';
		html += '</div>';
		$video.append(html);

		$("#" + obj.id + " .defCloseBtn").on("click", function () {
			$("#" + obj.id + " .definiArea").hide();
		});

		///////////////////////////////默认值,事件相关处理///////////////////////////
		var $line1bq = $("#" + obj.id + " .line1bq");
		var $line1gq = $("#" + obj.id + " .line1gq");
		var $line1cq = $("#" + obj.id + " .line1cq");
		var $line2cq = $("#" + obj.id + " .line2cq");
		var $xiaonei = $("#" + obj.id + " .xiaonei");
		var $definiArea = $("#" + obj.id + " .definiArea");

		// options.schoolIp=false;
		if (!options.schoolIp) {
			$xiaonei.addClass("xiaoneioff");
		}

		$line1bq.on("click", function () {
			player.sdk.setDefinition("350");
			$line1bq.attr("class", "line1bq_1");
			$line1gq.attr("class", "line1gq");
			$line1cq.attr("class", "line1cq");
			$definiArea.hide();
		});

		$line1gq.on("click", function () {
			player.sdk.setDefinition("1000");
			$line1bq.attr("class", "line1bq");
			$line1gq.attr("class", "line1gq_1");
			$line1cq.attr("class", "line1cq");
			$definiArea.hide();
		});

		$line1cq.on("click", function () {
			player.sdk.setDefinition("1300");
			$line1bq.attr("class", "line1bq");
			$line1gq.attr("class", "line1gq");
			$line1cq.attr("class", "line1cq_1");
			$definiArea.hide();
		});

		$line2cq.on("click", function () {
			options.rate = null;
			options.defini = "line2cq";
			toVjsPlayer(obj);
		});

		$xiaonei.on("click", function () {
			options.rate = null;
			options.defini = "xiaonei";
			toVjsPlayer(obj);
		});

		if (options.defini != null) {
			$("#" + obj.id + " ." + options.defini).addClass(options.defini + "_1");
			if (options.defini == "line1bq") {
				player.sdk.setDefinition("350");
			} else if (options.defini == "line1gq") {
				player.sdk.setDefinition("1000");
			} else if (options.defini == "line1cq") {
				player.sdk.setDefinition("1300");
			}

		} else {

			var def = player.sdk.getDefaultDefinition();
			if (def == "350") {
				def = "line1bq";
			} else if (def == "1000") {
				def = "line1gq";
			} else if (def == "1300") {
				def = "line1cq";
			}
			if (def != "") {
				$("#" + obj.id + " ." + def).addClass(def + "_1");
			}

		}
	};

	//进度条
	var initProgress = function (obj) {

		var html = '<div class="progress">';
		html += '<div class="progressBar">';
		html += '<div class="progressBall">';
		html += '<div class="progressNumber">00:00</div>';
		html += '</div>';
		html += '<div class="passTime"></div>';
		html += '</div>';
		html += '</div>';

		obj.$ableControlBar.append(html);
		var player = obj.player;

		var $progress = $("#" + obj.id + " .progress");
		var $progressBar = $("#" + obj.id + " .progressBar");
		var $progressBall = $("#" + obj.id + " .progressBall");
		var $progressNumber = $("#" + obj.id + " .progressNumber");
		var $passTime = $("#" + obj.id + " .passTime");
		var totalLength;

		//时间改变时自动改变进度条
		player.on("timeupdate", "", function () {
			var player.sdk.getVideoSetting().duration = parseInt($(".vjs-duration-display").clone().children().remove().end().text().trim());
			var player.sdk.getVideoTime() = parseInt($(".vjs-duration-display").clone().children().remove().end().text().trim());
			if (!$progressNumber.is(':visible')) {
				var duration = parseInt(player.sdk.getVideoSetting().duration);
				var currentTime = parseInt(player.sdk.getVideoTime());
				var left = currentTime / duration * 100;
				totalLength = $("#" + obj.id).width();
				var barLeft = (currentTime / duration) * (totalLength - $progressBall.width());
				$progressBall.css("left", barLeft + "px");
				$passTime.css("width", left + "%");
			}

		});

		// 点击进度条
		$progress.on("mousedown", function (event) {

			var left = event.pageX - $progressBar.offset().left - parseInt($progressBall.css("width")) / 2;
			var moveArea = parseInt($progressBar.css("width")) - parseInt($progressBall.css("width"));

			var currentTime = left / moveArea * player.sdk.getVideoSetting().duration;
			$progressNumber.html(PlayerUtil.parseSeconds(Math.round(currentTime)));
			$progressNumber.show();

			//跳转到点击的时间点  (乐视会自动开始播放)
			player.sdk.seekTo(currentTime);
			$("#" + obj.id + " #playButton").attr("class", "pauseButton");
			$("#" + obj.id + " .bigPlayButton").hide();

			if (left <= 0) {
				$progressBall.css("left", "0px");
			} else if (left > moveArea) {
				$progressBall.css("left", moveArea + "px");
				$passTime.css("width", $progressBar.css("width"));
			} else {
				$progressBall.css("left", left + "px");
				$passTime.css("width", left);
			}
		});

		//点击进度条离开后
		$($progress).on("mouseup", function () {
			$progressNumber.hide();
		});

		//滑动进度条
		$progressBall.on("mousedown", function () {

			$(document).on("mousemove.progressBar", function (event) {
				var left = event.pageX - $progressBar.offset().left - parseInt($progressBall.css("width")) / 2;
				var moveArea = parseInt($progressBar.css("width")) - parseInt($progressBall.css("width"));
				$progressNumber.show();

				if (left <= 0) {
					$progressBall.css("left", "0px");
				} else if (left > moveArea) {
					$progressBall.css("left", moveArea + "px");
					$passTime.css("width", $progressBar.css("width"));
				} else {
					var currentTimeStr = PlayerUtil.parseSeconds(Math.round(left / moveArea * player.sdk.getVideoSetting().duration));
					$progressNumber.html(currentTimeStr);
					$progressBall.css("left", left + "px");
					$passTime.css("width", left);
				}
			});
			$(document).on("mouseup.progressBar", function (event) {

				var left = event.pageX - $progressBar.offset().left - parseInt($progressBall.css("width")) / 2;
				var moveArea = parseInt($progressBar.css("width")) - parseInt($progressBall.css("width"));

				player.sdk.seekTo(left / moveArea * player.sdk.getVideoSetting().duration);
				if (player.paused)
					player.sdk.pauseVideo();

				$progressNumber.hide();
				$(document).off(".progressBar");
			});
		});

	};

	//播放按钮
	var initPlayBtn = function (obj) {

		var html = '<div id="playButton" class="playButton pointer">';
		html += '<div class="bigPlayButton pointer"></div>';
		html += "</div>";
		obj.$ableControlBar.append(html);

		//////////////////////////////////////////////////////////////////////////////////////////////

		var options = obj.options;
		var player = obj.player;
		var $playButton = $("#" + obj.id + " #playButton");
		var $bigPlayButton = $("#" + obj.id + " .bigPlayButton");

		//检测是否自动播放
		if (options.autostart) {
			options.beStart = true;
			player.paused = false;
			$playButton.attr("class", "pauseButton");
			$bigPlayButton.hide();
		} else {
			player.paused = true;
			options.beStart = false;
			$playButton.attr("class", "playButton");
			if (options.control.bigPlayerBtn) {
				$bigPlayButton.show();
			} else {
				$bigPlayButton.hide();
			}
		}

		$playButton.on("click", function () {

			if (player.paused) {
				$playButton.attr("class", "pauseButton");
				$bigPlayButton.hide();
				if (options.beStart) {
					player.sdk.resumeVideo();
				} else {
					player.sdk.startUp();
					options.beStart = true;
				}
				player.paused = false;
			} else {
				$playButton.attr("class", "playButton");
				if (options.control.bigPlayerBtn) {
					$bigPlayButton.show()
				}
				player.sdk.pauseVideo();
				player.paused = true;

			}
		});
	};

	//时间
	var initTime = function (obj) {

		var html = '<div class="nPlayTime">';
		html += '<span class="currentTime">00:00:00</span>/<span class="duration">00:00:00</span>';
		html += "</div>";

		obj.$ableControlBar.append(html);

		///////////////////////////////////////////////////////////////////////////////////////////////////

		var player = obj.player;

		var duration = parseInt($(".vjs-duration-display").clone().children().remove().end().text().trim());
		duration = PlayerUtil.parseSeconds(duration);
		$("#" + obj.id + " .duration").html(duration == "NaN:NaN:NaN" ? "00:00:00" : duration);
		player.on("timeupdate", "", function (event) {
			var currentTime = parseInt($(".vjs-duration-display").clone().children().remove().end().text().trim());
			currentTime = PlayerUtil.parseSeconds(currentTime);
			$("#" + obj.id + " .currentTime").html(currentTime);

		});

	};

	//速率
	var initRateBtn = function (obj) {

		var options = obj.options;
		var containerId = obj.id;

		//如果播放器不支持video标签,则不显示速率按钮
		if (!PlayerUtil.supportVideo()) {
			return;
		}

		var html = '<div class="speedBox">';
		// html+='<div id="speedTab"  class="speedTab">';
		// html+='<span  id="showTxt"  class="showTxt">x 1.0</span>';
		html += '<div class="speedList">';
		html += '<div class="speedTab05" rate="0.5" ></div>';
		html += '<div class="speedTab10" rate="1.0" ></div>';
		html += '<div class="speedTab15" rate="1.5" ></div>';
		html += '</div>';
		html += '</div>';
		html += '</div>';
		obj.$ableControlBar.append(html);

		////////////////////////////////////////////////////////////////////////////////////////////////////////
		var $speedList = $("#" + obj.id + " .speedList");
		var $speedBox = $("#" + obj.id + " .speedBox");
		if (!options.control.rateBtn) {
			$speedBox.hide();
		}

		$speedList.children().each(function (i, n) {
			var $this = $(n);
			var rate = $this.attr("rate");

			if (rate != "1.0") {
				$this.on("click", function () {
					options.defini = null;
					options.rate = rate;
					toVjsPlayer(obj);
				});
			}
		});

	};

	//全屏
	var initFull = function (obj) {
		var html = '<div class="fullScreen"></div>';
		obj.$ableControlBar.append(html);

		/////////////////////////////////////////////////////////////////////////////////////////////////////
		var options = obj.options;

		var $fullScreen = $("#" + obj.id + " .fullScreen");
		if (!options.control.fullBtn) {
			$fullScreen.hide();
		}

		options.isFullscreen = 0; //是否全屏  默认否

		$fullScreen.on("click", function () {
			if (options.isFullscreen == 0) {
				PlayerStarter.requestFullPlay(obj);
			} else {
				PlayerStarter.exitFullPlay();
			}
		});

	};

	//音量控制
	var initVolume = function (obj) {

		var html = '<div class="volumeBox">';
		html += '<div class="volumeIcon"></div>';
		html += '<div class="volumeBar">';
		html += '<div class="volumeBall">';
		html += '<div class="volumeNumber">0%</div>';
		html += '</div>';
		html += '<div class="passVolume"></div>';
		html += '</div>';
		html += '</div>';

		obj.$ableControlBar.append(html);

		////////////////////////////////////////////////////////////////////////////////////////
		var options = obj.options;

		if (!options.control.volumeBtn) {
			$("#" + obj.id + " .volumeBox").hide();
		}

		setVolume(obj);
		iconClick(obj);
		volumeSliding(obj);
		volumeBarClick(obj);

	};

	//设置默认音量
	var setVolume = function (obj) {

		var player = obj.player;

		var defaultVolume = 0.5;
		setTimeout(function () { //乐视sdk 初始化后无法立即使用,所有延迟触发
			player.sdk.setVolume(defaultVolume); //默认音量50%
		}, 100);

		var $volumeBall = $("#" + obj.id + " .volumeBall");
		var $volumeBar = $("#" + obj.id + " .volumeBar");
		var $passVolume = $("#" + obj.id + " .passVolume");
		var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));

		$volumeBall.css("left", moveArea * defaultVolume + "px");
		$passVolume.css("width", moveArea * defaultVolume);
	};

	//绑定音量图标点击事件
	var iconClick = function (obj) {

		var player = obj.player;

		var $volumeBall = $("#" + obj.id + " .volumeBall");
		var $volumeBar = $("#" + obj.id + " .volumeBar");
		var $volumeBox = $("#" + obj.id + " .volumeBox");
		var $passVolume = $("#" + obj.id + " .passVolume");
		var $volumeIcon = $("#" + obj.id + " .volumeIcon");
		var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));
		var lastVolume = 0;
		var nowVolume = 0;
		$volumeIcon.on("mousedown", function () {

			$volumeBox.toggleClass("volumeNone");
			nowVolume = player.sdk.getVideoSetting().volume;
			if (nowVolume == 0) {
				player.sdk.setVolume(lastVolume);
				$volumeBall.css("left", lastVolume * moveArea + "px");
				$passVolume.css("width", lastVolume * moveArea);
			} else {
				lastVolume = nowVolume;
				player.sdk.setVolume(0);
				$volumeBall.css("left", "0px");
				$passVolume.css("width", "0px");
			}
		});
	};

	//绑定音量条点击事件
	var volumeBarClick = function (obj) {

		var player = obj.player;

		var $volumeBall = $("#" + obj.id + " .volumeBall");
		var $volumeNumber = $("#" + obj.id + " .volumeNumber");
		var $volumeBar = $("#" + obj.id + " .volumeBar");
		var $volumeBox = $("#" + obj.id + " .volumeBox");
		var $passVolume = $("#" + obj.id + " .passVolume");

		$volumeBar.on("mousedown", function (event) {
			$volumeNumber.show();
			var left = event.pageX - $volumeBar.offset().left - parseInt($volumeBall.css("width")) / 2;
			var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));

			var vNum = left / moveArea;

			if (vNum <= 1 && vNum >= 0) {
				player.sdk.setVolume(vNum); //设置音量
			}

			if (left <= 0) {
				$volumeBall.css("left", "0px");
				$volumeNumber.html("0%");
				$volumeBox.addClass("volumeNone");
			} else if (left > moveArea) {
				$volumeBall.css("left", moveArea + "px");
				$passVolume.css("width", $volumeBar.css("width"));
				$volumeNumber.html("100%");
				$volumeBox.removeClass("volumeNone");
			} else {
				$volumeBall.css("left", left + "px");
				$passVolume.css("width", left);
				$volumeNumber.html(Math.round(vNum * 100) + "%");
				$volumeBox.removeClass("volumeNone");
			}
		});

		$volumeBar.on("mouseup", function () {
			$volumeNumber.hide();
		});

	};

	//绑定音量滑动条
	var volumeSliding = function (obj) {
		var player = obj.player;

		var $volumeBall = $("#" + obj.id + " .volumeBall");
		var $volumeNumber = $("#" + obj.id + " .volumeNumber");
		var $volumeBar = $("#" + obj.id + " .volumeBar");
		var $volumeBox = $("#" + obj.id + " .volumeBox");
		var $passVolume = $("#" + obj.id + " .passVolume");

		$volumeBall.on("mousedown", function () {
			$(document).on("mousemove.volumeBar", function (event) {

				$volumeNumber.show();
				var left = event.pageX - $volumeBar.offset().left - parseInt($volumeBall.css("width")) / 2;
				var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));

				var vNum = left / moveArea;

				if (vNum <= 1 && vNum >= 0) {
					player.sdk.setVolume(vNum); //设置音量
				}

				if (left <= 0) {
					$volumeBall.css("left", "0px");
					$volumeNumber.html("0%");
					$volumeBox.addClass("volumeNone");
				} else if (left > moveArea) {
					$volumeBall.css("left", moveArea + "px");
					$passVolume.css("width", $volumeBar.css("width"));
					$volumeNumber.html("100%");
					$volumeBox.removeClass("volumeNone");
				} else {
					$volumeBall.css("left", left + "px");
					$passVolume.css("width", left);
					$volumeNumber.html(Math.round(vNum * 100) + "%");
					$volumeBox.removeClass("volumeNone");
				}
			});
			$(document).on("mouseup.volumeBar", function () {
				$volumeNumber.hide();
				$(document).off(".volumeBar");
			});
		});
	};

	//清晰度
	var initDefini = function (obj) {
		var html = '<div class="definiBox">';
		html += '</div>';
		obj.$ableControlBar.append(html);

		/////////////////////////////////////////////////////////////////////
		var containerId = obj.id;
		var $definiBox = $("#" + containerId + " .definiBox");
		if (!obj.options.control.definiBtn) {
			$definiBox.hide();
		}

		$definiBox.on("click", function () {
			$("#" + containerId + " .definiArea").toggle();
		});
	};

	//字幕
	var initTrack = function (obj) {

		var html = '<div class="commonBoxDef">';
		html += '<div class="trackList">';
		// html+='<div class="speedTab">中英文</div>';
		// html+='<div class="speedTab">英文</div>';
		// html+='<div class="speedTab">中文</div>';
		html += '</div>';
		html += '</div>';
		obj.$ableControlBar.append(html);

		////////////////////////////////////////////////////////////////////
		if (!obj.options.control.trackBtn) {
			$("#" + obj.id + " .commonBoxDef").hide();
		}

		addTrack(obj);
		bindTrack(obj);

	};

	var addTrack = function (obj) {

		var options = obj.options;

		var $commonBox = $("#" + obj.id + " .commonBoxDef");
		var $trackList = $("#" + obj.id + " .trackList");

		if (options.track == null || options.track.length < 1) {
			$commonBox.hide();
			options.control.trackBtn = false;
		} else {

			if (options.track.length == 1) {
				$trackList.css("top", "-40px");
			}

			$(options.track).each(function (index, element) {

				var language = options.track[index].language;

				var lable;
				if (language == "0") { //中文
					language = "zh";
					lable = "中文";
				}
				if (language == "1") { //英文
					language = "en";
					lable = "英文";
				}
				if (language == "2") { //中英文
					return true;
					// language="zhen";
					// lable="中英文";
				}
				$trackList.append('<div class="speedTab' + language + '" language="' + language + '"></div>');
			});
		}
	};

	var bindTrack = function (obj) {

		var options = obj.options;

		var $trackList = $("#" + obj.id + " .trackList");

		$trackList.children().each(function (i, n) {
			var $this = $(n);

			//绑定点击事件
			$this.on("click", function () {
				options.rate = null;
				options.defini = null;
				options.language = $this.attr("language");
				toVjsPlayer(obj);
			});
		});
	};

	//弹幕开关
	var initDanmu = function (obj) {

		var html = '<div id="danmu" class="bulletSwitch bulletSwitchOn">';
		// html+='<div>弹幕</div>';
		// html+='<span></span>';
		html += '</div>';

		obj.$ableControlBar.append(html);

		/////////////////////////////////////////////////////////////////////////////////////

		var containerId = obj.id;

		if (!obj.options.control.danmuBtn) {
			$("#" + containerId + " #danmu").hide();
		}

		obj.$videoArea.addClass("container");
		obj.$videoArea.parent().addClass("abp");

		if (!window.isIE8) {
			obj.cm = new CommentManager(obj.$videoArea[0]);
			obj.cm.init();
			obj.cm.start();
		}

		$("#" + containerId + " #danmu").on("click", function () {
			var $_this = $(this);
			if ($_this.hasClass("bulletSwitchOn")) {
				$_this.removeClass("bulletSwitchOn");
				$_this.addClass("bulletSwitchOff");
				if (!window.isIE8) {
					obj.cm.clear();
				}
				return;
			}

			if ($_this.hasClass("bulletSwitchOff")) {
				$_this.removeClass("bulletSwitchOff");
				$_this.addClass("bulletSwitchOn");
				return;
			}
		});

	};

	//跳转到vjs播放器
	var toVjsPlayer = function (obj) {
		PlayerStarter.exitFullPlay();
		var c;
		["webkit", "moz", "o", "ms"].forEach(function (a) {
			"undefined" != typeof document[a + "Hidden"] && (c = a)
		});
		$(document).off(c + "visibilitychange", obj.letvztBugFn);
		$(document).off("visibilitychange", obj.letvztBugFn);
		$("#" + obj.id).videojsPlayer(obj);
	};

	//鼠标移动相关
	var active = function (obj) {

		if (obj.options.control.controlBar == 0) {
			return;
		}
		var player = obj.player;
		var containerId = obj.id;

		player.on("useractive", containerId, function () {
			obj.$ableControlBar.show();
		});

		player.on("userinactive", containerId, function () {
			obj.$ableControlBar.slideUp();
		});
	};

	//绑定点击事件
	var bindClick = function (obj) {

		var player = obj.player;
		var options = obj.options;
		var $container = $("#" + obj.id);

		var timer = null;
		var $videoArea = obj.$videoArea;

		$videoArea.on('click', function () {
			clearTimeout(timer);
			timer = setTimeout(function () { //在单击事件中添加一个setTimeout()函数，设置单击事件触发的时间间隔

					var $playButton = $("#" + obj.id + " #playButton");
					var $bigPlayButton = $("#" + obj.id + " .bigPlayButton");

					if (player.paused) {
						$playButton.attr("class", "pauseButton");
						$bigPlayButton.hide();
						player.sdk.resumeVideo();
						player.paused = false;
					} else {
						$playButton.attr("class", "playButton");
						if (options.control.bigPlayerBtn) {
							$bigPlayButton.show()
						}
						player.sdk.pauseVideo();
						player.paused = true;
					}

				}, 300);

		});

		$videoArea.on('dblclick', function () {
			clearTimeout(timer);
			if (options.isFullscreen == 0) {
				PlayerStarter.requestFullPlay(obj);
			} else {
				PlayerStarter.exitFullPlay();
			}
		});

	};

	window.letvComponent = letvComponent;

	/////////////////////////////////////////////回调///////////////////////////////////////////////////////////////////

	window.letvCB = function (type, data, obj) {

		var options = obj.options;

		var $playButton = $("#" + obj.id + " #playButton");
		var $bigPlayButton = $("#" + obj.id + " .bigPlayButton");

		if (type == "videoStop") { //视频播放完毕
			if (options.beStart) {
				obj.player.paused = true;
				$playButton.attr("class", "playButton");
				if (options.control.bigPlayerBtn) {
					$bigPlayButton.show();
				} else {
					$bigPlayButton.hide();
				}
			}
			var allDuration = parseInt(obj.player.sdk.getVideoSetting().duration);
			allDuration = PlayerUtil.parseSeconds(allDuration);
			$("#" + obj.id + " .currentTime").html(allDuration);
			$("#" + obj.id + " .progressBall").css("left", "100%");
			$("#" + obj.id + " .progressBall").css("margin-left", "-16px");
		}

		if (type == "videoStart" || type == "videoResume") { //视频开始播放or恢复播放
			$("#" + obj.id + " .progressBall").css("margin-left", "0px");
			$playButton.attr("class", "pauseButton");
			$bigPlayButton.hide();
			if (!window.isIE8) {
				obj.cm.start();
			}
		}

		if (type == "videoPause") { //视频暂停
			$playButton.attr("class", "playButton");
			if (options.control.bigPlayerBtn) {
				$bigPlayButton.show();
			} else {
				$bigPlayButton.hide();
			}
			if (!window.isIE8) {
				obj.cm.stop();
			}
		}

	};

	/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	function letvAPI(obj) {
		this.obj = obj;
	}

	letvAPI.prototype = {

		seek: function (second) {
			try {
				this.obj.player.sdk.seekTo(second);
			} catch (e) {
				PlayerUtil.log("letv跳转进度失败!");
			}
		},
		setFullscreen: function () {},
		play: function () {

			try {
				this.obj.player.sdk.resumeVideo();
				this.obj.player.paused = false;
			} catch (e) {
				PlayerUtil.log("letv播放失败!");
			}

		},
		pause: function () {

			try {
				this.obj.player.sdk.pauseVideo();
				this.obj.player.paused = true;
			} catch (e) {
				PlayerUtil.log("letv暂停失败!");
			}

		},
		getDuration: function () {

			try {
				return this.obj.player.sdk.getVideoSetting().duration;
			} catch (e) {
				PlayerUtil.log("letv获取总时间失败!");
			}

		},
		getPosition: function () {
			try {
				return this.obj.player.sdk.getVideoTime();
			} catch (e) {
				PlayerUtil.log("letv获取播放进度失败!");
			}

		},
		addCourseInfo: function (info) {

			try {
				this.obj.courseInfo = $.extend(this.obj.courseInfo, info);
			} catch (e) {
				PlayerUtil.log("letv添加课程信息失败!");
			}

		},
		dispose: function () {
			try {
				this.obj.player.sdk.shutDown(); //letv无摧毁实例的方法,暂用关闭视频方法
				var c;
				["webkit", "moz", "o", "ms"].forEach(function (a) {
					"undefined" != typeof document[a + "Hidden"] && (c = a)
				});
				$(document).off(c + "visibilitychange", this.obj.letvztBugFn);
				$(document).off("visibilitychange", this.obj.letvztBugFn);
				PlayerStarter.del(this.obj.id);
			} catch (e) {
				PlayerUtil.log("letv销毁视频失败!");
			}
		},
		getFullStatus: function () { //获取全屏状态   false:非全屏   true:全屏
			try {
				return this.obj.options.isFullscreen != 0;
			} catch (e) {
				PlayerUtil.log("letv获取全屏状态失败!");
			}

		},
		exitFullPlay: function () { //退出全屏
			try {
				PlayerStarter.exitFullPlay();
			} catch (e) {
				PlayerUtil.log("letv退出全屏失败");
			}

		},
		resize: function (width, height) { //动态改变播放器的大小

			try {
				if (!this.getFullStatus()) {
					var $container = $("#" + this.obj.id);
					$container.width(width);
					$container.height(height);
					PlayerStarter.resetControls(this.obj);
					if (!window.isIE8) {
						this.obj.cm.init();
					}
				}
			} catch (e) {
				PlayerUtil.log("vjs改变播放器大小失败!");
			}

		},
		insertPopup: function (htmlstr) {

			try {
				var $popup = $('<div class="ablePlayerPopup-container"><table class="tbl-pop"><tr><td align="center"><div class="reset-ele"></div></td></tr></table></div>');
				$popup.find(".reset-ele").append(htmlstr);
				var $container = $("#" + this.obj.id);
				$container.children("div :eq(0)").append($popup[0]);
			} catch (e) {
				PlayerUtil.log("vjs添加弹出层失败!");
			}

		},
		removePopup: function () {
			try {
				var $popup = $("#" + this.obj.id + " .ablePlayerPopup-container");
				$popup.remove();
			} catch (e) {
				PlayerUtil.log("vjs删除弹出层失败!");
			}
		},
		sendDanmu: function (msg) {

			try {

				if (this.obj.defOptions.control.danmuBtn && $("#" + this.obj.id + " #danmu").hasClass("bulletSwitchOn") && !window.isIE8) {

					var cm = this.obj.cm;
					var obj = cclUtil.getMsgObj(msg);
					cm.send(obj);

				}
			} catch (e) {

				PlayerUtil.log("letv发送弹幕失败!");
			}

		}

	};
	window.letvAPI = letvAPI;

}
	());
(function () {

	//注册自有callback
	var letvExtend = function () {

		//添加事件
		CloudVodPlayer.prototype.on = function (type, containerId, fn) {

			var player = this;
			if (type == "timeupdate") {
				timeupdate(player, fn);
			} else if (type == "userinactive") {
				userinactive(containerId, fn);
			} else if (type == "useractive") {
				useractive(containerId, fn);
			}
		};

	};

	//视频进度改变
	var timeupdate = function (player, fn) {
		var lastTime = player.sdk.getVideoTime();
		setInterval(function () {
			var nowTime = player.sdk.getVideoTime();

			if (nowTime != lastTime && nowTime != 0) {
				fn();
				lastTime = nowTime;
			}
		}, 500);
	};

	//静止回调
	var userinactive = function (containerId, fn) {
		var $container = $("#" + containerId);

		var lastX = 0;
		var lastY = 0;
		var checkX = 0;
		var checkY = 0;
		var maxtime = 3000; //自定义参数
		var interval = 500;
		var maxIntervalNum = maxtime / interval;
		var intervalNum = 0;

		$container.mousemove(function (e) {

			lastX = e.offsetX;
			lastY = e.offsetY;
		});

		setInterval(function () {
			if (checkX == lastX && checkY == lastY) {
				intervalNum++;
			} else {
				checkX = lastX;
				checkY = lastY;
				intervalNum = 1;
			}

			if (intervalNum == maxIntervalNum) {
				fn();
			}
		}, interval);

	};

	var useractive = function (containerId, fn) {

		$("#" + containerId).mousemove(function (e) {
			fn();
		});

	};

	window.letvExtend = letvExtend;
})();
(function () {

	$.fn.letvPlayer = function (obj) {
		createPlayer(obj);
	};

	var GLOBAL_LANGUAGE = {
		TIPS_EXCHANGE: "您好！当前视频正在转码中，请等待一段时间后尝试重新播放。",
		TIPS_ERROR_NO_VIDEO_ID: "抱歉，音/视频文件转码异常, 请联系客服快速解决此问题！视频Id: ",
		TIPS_ISCODING_AUTOCHANGE: "当前视频可能正在转码中,暂时不能播放, 自动为您尝试另一种播放器播放...",
		TIPS_ERROR_VIDEO_SHUTDOWN: "抱歉, 音/视频已停用!",
		TIPS_LOADING: "玩命加载中…",
		TIPS_NO_VIDEO_ID: "缺少视频id!"
	};

	/**
	 * 创建乐视播放器
	 */
	var createPlayer = function (obj) {

		obj.times.creatTime = new Date().getTime();
		obj.currentPlayerType = PlayerStarter.playerTypes["letv"];
		var options = obj.options;

		$.ajax({

			type: "get",
			data: {},
			url: "http://base1.zhihuishu.com/able-commons/letvvideo/getVideo?id=" + options.id + "&jsonp=?",
			dataType: "jsonp",
			jsonp: "jsonp",
			async: true,
			cache: false,
			success: function (data) {

				if (data.code != "1") {
					// PlayerUtil.log("获取乐视视频信息接口异常!");
					// PlayerStarter.showError(obj,"02","处理中:请切换线路二");
					data["data"] = {
						"code": "0",
						"data": {
							"video_unique": ""
						}
					}
				}
				var letvData = data["data"];
				if (letvData["code"] == "0") { //乐视接口返回状态代码，为0表示数据加载成功
					var videoData = letvData.data;
					var videoStatus = videoData.status;

					options.vuid = videoData.video_unique;
					loadTrack(obj);

					if ("10" == videoStatus) { //视频状态：10表示可以正常播放；20表示处理失败；30表示正在处理过程中


					} else if ("30" == videoStatus) {
						PlayerUtil.log("视频处理中!");
					} else if ("20" == videoStatus) {
						PlayerUtil.log("视频处理失败!");
					} else if ("40" == videoStatus) {
						PlayerUtil.log("抱歉, 音/视频已停用!");
					} else {
						PlayerUtil.log("音/视频状态异常!请重新上传!")
					}
				}

			},
			error: function (err) {}
		});

	};

	/**
	 * 加载字幕信息
	 */
	var loadTrack = function (obj) {

		var $container = $("#" + obj.id);
		var ableMediaUrl = "http://base1.zhihuishu.com/able-commons/cdn/media/ableplayerV4/?d=a&jsoncallback=?";
		var sourceSrc;
		var cdnSrc;
		var param = {
			id: obj.options.id,
			host: ""
		};

		$.getJSON(ableMediaUrl, param, function (result) {

			if (result.sources[1].status == "10") {

				sourceSrc = result.sources[1]["file"];

				if (sourceSrc != "") {
					obj.options.track = result.subtitle;
					initVideo(obj);
				} else {
					PlayerUtil.log("未查询到视频src!");
				}
			} else {
				PlayerUtil.log("视频转码未成功!");
				PlayerStarter.showError(obj, "01", "视频转码中,请稍后重试");
				PlayerStarter.del(obj.id);
			}

		});

	};

	function initVideo(obj) {

		var options = obj.options;
		var containerId = obj.id;
		PlayerUtil.log("vu:" + options.vuid);
		PlayerUtil.log("uu:2b686d84e3");

		var $container = $("#" + obj.id);
		options.width = $container.width();
		options.height = $container.height();

		var player = new CloudVodPlayer();

		//判断是否自动开启播放器
		var autoplay = options.autostart == true ? 1 : 0;

		player.init({
			uu: "2b686d84e3", //固定
			vu: options.vuid,
			controls: '0', //隐藏控制条
			autoplay: autoplay, //自动播放
			skinnable: '0', //不显示乐视皮肤
			isPauseOrResume: 1, //swf  下开启回调  letv文档中没有
			type: PlayerUtil.supportVideo() ? "video" : "swf",
			pic: options.image,
			// callbackJs:'callBackHandle'
			callbackJs: containerId + "call"
		}, containerId);

		obj.player = player;
		window[containerId + "call"] = function (type, data) {
			letvCallback(type, data, obj);
		};

	}

	//对外提供的回调事件
	var letvCallback = function (type, data, obj) {

		var callback = obj.callback;
		var options = obj.options;

		if (obj.afterInit) {
			letvCB(type, data, obj);
		}

		if (type == "playerInit") {

			//修补乐视问题.(切换浏览器时会停止的BUG)
			var c;
			["webkit", "moz", "o", "ms"].forEach(function (a) {
				"undefined" != typeof document[a + "Hidden"] && (c = a)
			});

			obj.letvztBugFn = function () {
				if (!obj.player.paused) {
					obj.player.sdk.resumeVideo();
				}
			};
			$(document).on(c + "visibilitychange", obj.letvztBugFn);
			$(document).on("visibilitychange", obj.letvztBugFn);

			obj.afterInit = true;
			obj.times.initEndTime = new Date().getTime();
			afterInit(obj);
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onReady)) {
				callback.onReady();
			}
		}

		if (type == "videoStop") {
			if (options.beStart) {
				if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onComplete)) {
					callback.onComplete();
				}
			}
		}

		if (type == "videoPause") {
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onPause)) {
				callback.onPause();
			}
		}

		if (type == "videoResume") {
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onPlay)) {
				callback.onPlay();
			}
		}

		if (type == "videoStart") {
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onPlay)) {
				callback.onPlay();
			}
		}

		if (type == "videoError") {
			afterInit(obj);
			obj.$videoArea.prev().remove();
			PlayerStarter.showError(obj, "02", "视频异常:请切换线路二");
			PlayerStarter.del(obj.id);
		}

	};

	/**
	 * 初始化之后
	 */
	var afterInit = function (obj) {

		//打印清晰度列表
		try {
			// console.log(player.sdk.getDefinition());
			// console.log(player.sdk.getDefaultDefinition());
			// console.log(player.sdk.getDefinitionList());
			// console.log(player.sdk.getDefList());

		} catch (e) {
			// console.log(e);
		}

		//注册自有回调
		letvExtend();

		//加载UI
		letvComponent(obj);

		recordSeek(obj);

		PlayerUtil.log("乐视播放器初始化完成!");
	};

	//记录观看的时间  +  onTime回调
	var recordSeek = function (obj) {
		var options = obj.options;
		var player = obj.player;
		var callback = obj.callback;
		var tempSeek = options.seek;

		if (options.seek > 2) {
			setTimeout(function () { //乐视sdk 初始化后无法立即使用,所有延迟触发
				player.sdk.seekTo(tempSeek);
			}, 1000);
		}

		player.on("timeupdate", "", function () {
			options.seek = player.sdk.getVideoTime();

			if (obj.times.firstLoadTime == 0) {
				obj.times.firstLoadTime = new Date().getTime();
			}

			//播放进度改变通知回调事件
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onTime)) {
				callback.onTime(options.seek);
			}
		});
	};

})();
(function () {

	var sizes = [45, 30, 25, 36, 18, 25, 36, 45, 18, 64, 25, 36, 45, 30, 25, 36];
	var colors = [
		"000000", //黑色
		"C0C0C0", //灰色
		"ffffff", //白色
		"ff0000", //红色
		"00ff00", //绿色
		"0000ff", //蓝色
		"ffff00", //黄色
		"00ffff", //墨绿
		"ff00ff", //洋红
		"ffffff", //
		"ffffff", //
		"ffffff", //
		"ffffff", //
		"ffffff", //
		"ffffff", //
		"ffffff", //
		"ffffff" //
	];
	var modes = [
		1, //顶端滚动
		2, //底端滚动
		5, //顶端渐隐
		4, //底端渐隐
		6, //逆向滚动
		1 //顶端滚动
	];

	var cclUtil = {
		getMsgObj: function (msg) {

			var randomNum = parseInt(Math.random() * 11, 10);
			var color = colors[randomNum];
			var size = sizes[Math.floor(Math.random() * sizes.length)];
			var mode = modes[Math.floor(Math.random() * modes.length)];

			var obj = {
				// "mode":mode,
				"mode": 1,
				"text": ablePase(msg),
				"dur": 6000,
				"size": 33,
				"color": color
			};
			return obj;
		}

	};

	function ablePase(msgText) {

		msgText = msgText.replace(/\[呲牙\]/g, "<span class=\"face-item face-item-cy\"></span>");
		msgText = msgText.replace(/\[可爱\]/g, "<span class=\"face-item face-item-ka\"></span>");
		msgText = msgText.replace(/\[发怒\]/g, "<span class=\"face-item face-item-fn\"></span>");
		msgText = msgText.replace(/\[擦汗\]/g, "<span class=\"face-item face-item-ch\"></span>");
		msgText = msgText.replace(/\[坏笑\]/g, "<span class=\"face-item face-item-huaix\"></span>");
		msgText = msgText.replace(/\[惊恐\]/g, "<span class=\"face-item face-item-jk\"></span>");
		msgText = msgText.replace(/\[流泪\]/g, "<span class=\"face-item face-item-ll\"></span>");
		msgText = msgText.replace(/\[偷笑\]/g, "<span class=\"face-item face-item-tx\"></span>");
		msgText = msgText.replace(/\[调皮\]/g, "<span class=\"face-item face-item-tp\"></span>");
		msgText = msgText.replace(/\[咒骂\]/g, "<span class=\"face-item face-item-zhm\"></span>");
		msgText = msgText.replace(/\[委屈\]/g, "<span class=\"face-item face-item-wq\"></span>");
		msgText = msgText.replace(/\[晕\]/g, "<span class=\"face-item face-item-yun\"></span>");
		msgText = msgText.replace(/\[抓狂\]/g, "<span class=\"face-item face-item-zk\"></span>");
		msgText = msgText.replace(/\[色\]/g, "<span class=\"face-item face-item-se\"></span>");
		msgText = msgText.replace(/\[鄙视\]/g, "<span class=\"face-item face-item-bs\"></span>");
		msgText = msgText.replace(/\[闭嘴\]/g, "<span class=\"face-item face-item-bz\"></span>");
		msgText = msgText.replace(/\[发呆\]/g, "<span class=\"face-item face-item-fd\"></span>");
		msgText = msgText.replace(/\[困\]/g, "<span class=\"face-item face-item-kun\"></span>");
		msgText = msgText.replace(/\[抠鼻\]/g, "<span class=\"face-item face-item-kb\"></span>");
		msgText = msgText.replace(/\[阴险\]/g, "<span class=\"face-item face-item-yx\"></span>");
		msgText = msgText.replace(/\[吐\]/g, "<span class=\"face-item face-item-tuu\"></span>");
		msgText = msgText.replace(/\[奋斗\]/g, "<span class=\"face-item face-item-fendou\"></span>");
		msgText = msgText.replace(/\[惊讶\]/g, "<span class=\"face-item face-item-jy\"></span>");
		msgText = msgText.replace(/\[流汗\]/g, "<span class=\"face-item face-item-lh\"></span>");
		msgText = msgText.replace(/\[疑问\]/g, "<span class=\"face-item face-item-yiw\"></span>");
		msgText = msgText.replace(/\[嘘\]/g, "<span class=\"face-item face-item-xu\"></span>");
		msgText = msgText.replace(/\[冷汗\]/g, "<span class=\"face-item face-item-lengh\"></span>");
		msgText = msgText.replace(/\[鼓掌\]/g, "<span class=\"face-item face-item-gz\"></span>");
		msgText = msgText.replace(/\[哈欠\]/g, "<span class=\"face-item face-item-hq\"></span>");
		msgText = msgText.replace(/\[憨笑\]/g, "<span class=\"face-item face-item-hanx\"></span>");
		msgText = msgText.replace(/\[得意\]/g, "<span class=\"face-item face-item-dy\"></span>");
		msgText = msgText.replace(/\[亲亲\]/g, "<span class=\"face-item face-item-qq\"></span>");
		msgText = msgText.replace(/\[睡\]/g, "<span class=\"face-item face-item-shui\"></span>");
		msgText = msgText.replace(/\[右哼哼\]/g, "<span class=\"face-item face-item-yhh\"></span>");
		msgText = msgText.replace(/\[左哼哼\]/g, "<span class=\"face-item face-item-zhh\"></span>");
		msgText = msgText.replace(/\[折磨\]/g, "<span class=\"face-item face-item-zhem\"></span>");
		msgText = msgText.replace(/\[快哭了\]/g, "<span class=\"face-item face-item-kk\"></span>");
		msgText = msgText.replace(/\[可怜\]/g, "<span class=\"face-item face-item-kel\"></span>");
		msgText = msgText.replace(/\[糗大了\]/g, "<span class=\"face-item face-item-qd\"></span>");
		msgText = msgText.replace(/\[傲慢\]/g, "<span class=\"face-item face-item-am\"></span>");
		msgText = msgText.replace(/\[吓\]/g, "<span class=\"face-item face-item-xia\"></span>");
		msgText = msgText.replace(/\[酷\]/g, "<span class=\"face-item face-item-kuk\"></span>");
		msgText = msgText.replace(/\[大兵\]/g, "<span class=\"face-item face-item-db\"></span>");
		msgText = msgText.replace(/\[饥饿\]/g, "<span class=\"face-item face-item-jie\"></span>");
		msgText = msgText.replace(/\[衰\]/g, "<span class=\"face-item face-item-shuai\"></span>");
		msgText = msgText.replace(/\[骷髅\]/g, "<span class=\"face-item face-item-kl\"></span>");
		msgText = msgText.replace(/\[强\]/g, "<span class=\"face-item face-item-qiang\"></span>");
		msgText = msgText.replace(/\[弱\]/g, "<span class=\"face-item face-item-ruo\"></span>");
		msgText = msgText.replace(/\[敲打\]/g, "<span class=\"face-item face-item-qiao\"></span>");
		msgText = msgText.replace(/\[心碎\]/g, "<span class=\"face-item face-item-xs\"></span>");
		msgText = msgText.replace(/\[握手\]/g, "<span class=\"face-item face-item-ws\"></span>");
		msgText = msgText.replace(/\[胜利\]/g, "<span class=\"face-item face-item-shl\"></span>");
		msgText = msgText.replace(/\[差劲\]/g, "<span class=\"face-item face-item-cj\"></span>");
		msgText = msgText.replace(/\[NO\]/g, "<span class=\"face-item face-item-bu\"></span>");
		msgText = msgText.replace(/\[拳头\]/g, "<span class=\"face-item face-item-qt\"></span>");
		msgText = msgText.replace(/\[菜刀\]/g, "<span class=\"face-item face-item-cd\"></span>");
		msgText = msgText.replace(/\[炸弹\]/g, "<span class=\"face-item face-item-zhd\"></span>");
		msgText = msgText.replace(/\[便便\]/g, "<span class=\"face-item face-item-bb\"></span>");
		msgText = msgText.replace(/\[篮球\]/g, "<span class=\"face-item face-item-lq\"></span>");
		msgText = msgText.replace(/\[足球\]/g, "<span class=\"face-item face-item-zq\"></span>");
		msgText = msgText.replace(/\[闪电\]/g, "<span class=\"face-item face-item-shd\"></span>");
		msgText = msgText.replace(/\[猪头\]/g, "<span class=\"face-item face-item-zt\"></span>");
		msgText = msgText.replace(/\[乒乓\]/g, "<span class=\"face-item face-item-pp\"></span>");

		return msgText;
	}

	window.cclUtil = cclUtil;

})();
/*! jquery.cookie v1.4.1 | MIT */
!function (a) {
	"function" == typeof define && define.amd ? define(["jquery"], a) : "object" == typeof exports ? a(require("jquery")) : a(jQuery)
}
(function (a) {
	function b(a) {
		return h.raw ? a : encodeURIComponent(a)
	}
	function c(a) {
		return h.raw ? a : decodeURIComponent(a)
	}
	function d(a) {
		return b(h.json ? JSON.stringify(a) : String(a))
	}
	function e(a) {
		0 === a.indexOf('"') && (a = a.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
		try {
			return a = decodeURIComponent(a.replace(g, " ")),
			h.json ? JSON.parse(a) : a
		} catch (b) {}
	}
	function f(b, c) {
		var d = h.raw ? b : e(b);
		return a.isFunction(c) ? c(d) : d
	}
	var g = /\+/g,
	h = a.cookie = function (e, g, i) {
		if (void 0 !== g && !a.isFunction(g)) {
			if (i = a.extend({}, h.defaults, i), "number" == typeof i.expires) {
				var j = i.expires,
				k = i.expires = new Date;
				k.setTime(+k + 864e5 * j)
			}
			return document.cookie = [b(e), "=", d(g), i.expires ? "; expires=" + i.expires.toUTCString() : "", i.path ? "; path=" + i.path : "", i.domain ? "; domain=" + i.domain : "", i.secure ? "; secure" : ""].join("")
		}
		for (var l = e ? void 0 : {}, m = document.cookie ? document.cookie.split("; ") : [], n = 0, o = m.length; o > n; n++) {
			var p = m[n].split("="),
			q = c(p.shift()),
			r = p.join("=");
			if (e && e === q) {
				l = f(r, g);
				break
			}
			e || void 0 === (r = f(r)) || (l[q] = r)
		}
		return l
	};
	h.defaults = {},
	a.removeCookie = function (b, c) {
		return void 0 === a.cookie(b) ? !1 : (a.cookie(b, "", a.extend({}, c, {
					expires: -1
				})), !a.cookie(b))
	}
});
//  json2.js
//  2016-05-01
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
//  See http://www.JSON.org/js.html
//  This code should be minified before deployment.
//  See http://javascript.crockford.com/jsmin.html

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file is provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
//                          +a[5], +a[6]));
//                  }
//              }
//              return value;
//          });

//          myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
//              var d;
//              if (typeof value === "string" &&
//                      value.slice(0, 5) === "Date(" &&
//                      value.slice(-1) === ")") {
//                  d = new Date(value.slice(5, -1));
//                  if (d) {
//                      return d;
//                  }
//              }
//              return value;
//          });

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
eval, for, this
 */

/*property
JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
lastIndex, length, parse, prototype, push, replace, slice, stringify,
test, toJSON, toString, valueOf
 */

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
	JSON = {};
}

(function () {
	"use strict";

	var rx_one = /^[\],:{}\s]*$/;
	var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
	var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
	var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
	var rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
	var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

	function f(n) {
		// Format integers to have at least two digits.
		return n < 10
		 ? "0" + n
		 : n;
	}

	function this_value() {
		return this.valueOf();
	}

	if (typeof Date.prototype.toJSON !== "function") {

		Date.prototype.toJSON = function () {

			return isFinite(this.valueOf())
			 ? this.getUTCFullYear() + "-" +
			f(this.getUTCMonth() + 1) + "-" +
			f(this.getUTCDate()) + "T" +
			f(this.getUTCHours()) + ":" +
			f(this.getUTCMinutes()) + ":" +
			f(this.getUTCSeconds()) + "Z"
			 : null;
		};

		Boolean.prototype.toJSON = this_value;
		Number.prototype.toJSON = this_value;
		String.prototype.toJSON = this_value;
	}

	var gap;
	var indent;
	var meta;
	var rep;

	function quote(string) {

		// If the string contains no control characters, no quote characters, and no
		// backslash characters, then we can safely slap some quotes around it.
		// Otherwise we must also replace the offending characters with safe escape
		// sequences.

		rx_escapable.lastIndex = 0;
		return rx_escapable.test(string)
		 ? "\"" + string.replace(rx_escapable, function (a) {
			var c = meta[a];
			return typeof c === "string"
			 ? c
			 : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
		}) + "\""
		 : "\"" + string + "\"";
	}

	function str(key, holder) {

		// Produce a string from holder[key].

		var i; // The loop counter.
		var k; // The member key.
		var v; // The member value.
		var length;
		var mind = gap;
		var partial;
		var value = holder[key];

		// If the value has a toJSON method, call it to obtain a replacement value.

		if (value && typeof value === "object" &&
			typeof value.toJSON === "function") {
			value = value.toJSON(key);
		}

		// If we were called with a replacer function, then call the replacer to
		// obtain a replacement value.

		if (typeof rep === "function") {
			value = rep.call(holder, key, value);
		}

		// What happens next depends on the value's type.

		switch (typeof value) {
		case "string":
			return quote(value);

		case "number":

			// JSON numbers must be finite. Encode non-finite numbers as null.

			return isFinite(value)
			 ? String(value)
			 : "null";

		case "boolean":
		case "null":

			// If the value is a boolean or null, convert it to a string. Note:
			// typeof null does not produce "null". The case is included here in
			// the remote chance that this gets fixed someday.

			return String(value);

			// If the type is "object", we might be dealing with an object or an array or
			// null.

		case "object":

			// Due to a specification blunder in ECMAScript, typeof null is "object",
			// so watch out for that case.

			if (!value) {
				return "null";
			}

			// Make an array to hold the partial results of stringifying this object value.

			gap += indent;
			partial = [];

			// Is the value an array?

			if (Object.prototype.toString.apply(value) === "[object Array]") {

				// The value is an array. Stringify every element. Use null as a placeholder
				// for non-JSON values.

				length = value.length;
				for (i = 0; i < length; i += 1) {
					partial[i] = str(i, value) || "null";
				}

				// Join all of the elements together, separated with commas, and wrap them in
				// brackets.

				v = partial.length === 0
					 ? "[]"
					 : gap
					 ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
					 : "[" + partial.join(",") + "]";
				gap = mind;
				return v;
			}

			// If the replacer is an array, use it to select the members to be stringified.

			if (rep && typeof rep === "object") {
				length = rep.length;
				for (i = 0; i < length; i += 1) {
					if (typeof rep[i] === "string") {
						k = rep[i];
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (
									gap
									 ? ": "
									 : ":") + v);
						}
					}
				}
			} else {

				// Otherwise, iterate through all of the keys in the object.

				for (k in value) {
					if (Object.prototype.hasOwnProperty.call(value, k)) {
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (
									gap
									 ? ": "
									 : ":") + v);
						}
					}
				}
			}

			// Join all of the member texts together, separated with commas,
			// and wrap them in braces.

			v = partial.length === 0
				 ? "{}"
				 : gap
				 ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
				 : "{" + partial.join(",") + "}";
			gap = mind;
			return v;
		}
	}

	// If the JSON object does not yet have a stringify method, give it one.

	if (typeof JSON.stringify !== "function") {
		meta = { // table of character substitutions
			"\b": "\\b",
			"\t": "\\t",
			"\n": "\\n",
			"\f": "\\f",
			"\r": "\\r",
			"\"": "\\\"",
			"\\": "\\\\"
		};
		JSON.stringify = function (value, replacer, space) {

			// The stringify method takes a value and an optional replacer, and an optional
			// space parameter, and returns a JSON text. The replacer can be a function
			// that can replace values, or an array of strings that will select the keys.
			// A default replacer method can be provided. Use of the space parameter can
			// produce text that is more easily readable.

			var i;
			gap = "";
			indent = "";

			// If the space parameter is a number, make an indent string containing that
			// many spaces.

			if (typeof space === "number") {
				for (i = 0; i < space; i += 1) {
					indent += " ";
				}

				// If the space parameter is a string, it will be used as the indent string.

			} else if (typeof space === "string") {
				indent = space;
			}

			// If there is a replacer, it must be a function or an array.
			// Otherwise, throw an error.

			rep = replacer;
			if (replacer && typeof replacer !== "function" &&
				(typeof replacer !== "object" ||
					typeof replacer.length !== "number")) {
				throw new Error("JSON.stringify");
			}

			// Make a fake root object containing our value under the key of "".
			// Return the result of stringifying the value.

			return str("", {
				"": value
			});
		};
	}

	// If the JSON object does not yet have a parse method, give it one.

	if (typeof JSON.parse !== "function") {
		JSON.parse = function (text, reviver) {

			// The parse method takes a text and an optional reviver function, and returns
			// a JavaScript value if the text is a valid JSON text.

			var j;

			function walk(holder, key) {

				// The walk method is used to recursively walk the resulting structure so
				// that modifications can be made.

				var k;
				var v;
				var value = holder[key];
				if (value && typeof value === "object") {
					for (k in value) {
						if (Object.prototype.hasOwnProperty.call(value, k)) {
							v = walk(value, k);
							if (v !== undefined) {
								value[k] = v;
							} else {
								delete value[k];
							}
						}
					}
				}
				return reviver.call(holder, key, value);
			}

			// Parsing happens in four stages. In the first stage, we replace certain
			// Unicode characters with escape sequences. JavaScript handles many characters
			// incorrectly, either silently deleting them, or treating them as line endings.

			text = String(text);
			rx_dangerous.lastIndex = 0;
			if (rx_dangerous.test(text)) {
				text = text.replace(rx_dangerous, function (a) {
						return "\\u" +
						("0000" + a.charCodeAt(0).toString(16)).slice(-4);
					});
			}

			// In the second stage, we run the text against regular expressions that look
			// for non-JSON patterns. We are especially concerned with "()" and "new"
			// because they can cause invocation, and "=" because it can cause mutation.
			// But just to be safe, we want to reject all unexpected forms.

			// We split the second stage into 4 regexp operations in order to work around
			// crippling inefficiencies in IE's and Safari's regexp engines. First we
			// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
			// replace all simple value tokens with "]" characters. Third, we delete all
			// open brackets that follow a colon or comma or that begin the text. Finally,
			// we look to see that the remaining characters are only whitespace or "]" or
			// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

			if (
				rx_one.test(
					text
					.replace(rx_two, "@")
					.replace(rx_three, "]")
					.replace(rx_four, ""))) {

				// In the third stage we use the eval function to compile the text into a
				// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
				// in JavaScript: it can begin a block or an object literal. We wrap the text
				// in parens to eliminate the ambiguity.

				j = eval("(" + text + ")");

				// In the optional fourth stage, we recursively walk the new structure, passing
				// each name/value pair to a reviver function for possible transformation.

				return (typeof reviver === "function")
				 ? walk({
					"": j
				}, "")
				 : j;
			}

			// If the text is not JSON parseable, then a SyntaxError is thrown.

			throw new SyntaxError("JSON.parse");
		};
	}
}
	());
(function () {

	$(function () {
		window.isIE8 = (/MSIE\s8\.0/).test(navigator.userAgent);
		window.isIE9 = (/MSIE\s9\.0/).test(navigator.userAgent);
		window.isIE10 = (/MSIE\s10\.0/).test(navigator.userAgent);
	});

	var PlayerUtil = {
		debugMode: false,
		getQueryString: function (name) {
			var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
			var r = window.location.search.substr(1).match(reg);
			if (r != null) {
				return decodeURI(r[2]);
			}
			return null;
		},
		/**
		 * 如果地址栏上debugMode=1则输出log 否则不输出
		 * @param str 日志内容
		 */
		log: function (str) {
			if (this.getQueryString("debugMode") == 1 || this.debugMode) {
				if (window.console) {
					console.log(str);
				}
			}
		},
		//将秒转化成00:00格式
		parseSeconds: function (s) {

			// console.log(s);
			var hourPart = Math.floor(s / 3600);
			if (hourPart < 10) {
				hourPart = "0" + hourPart;
			}

			var secondPart = s % 3600 % 60;
			if (secondPart < 10) {
				secondPart = "0" + secondPart;
			}

			var minutesPart = Math.floor(s % 3600 / 60);
			if (minutesPart < 10) {
				minutesPart = "0" + minutesPart;
			}

			return hourPart + ":" + minutesPart + ":" + secondPart;
		},
		//是否使用H5播放
		supportVideo: function () {
			return !!document.createElement('video').canPlayType && !window.isIE9 && !this.isXPandFireFox();
			// return !!document.createElement('video').canPlayType&&!this.isXPandFireFox();
		},
		//检测是否安装了flash
		hasFlash: function () {
			var hasFlash = false;
			try {
				hasFlash = Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
			} catch (exception) {
				hasFlash = ('undefined' != typeof navigator.mimeTypes['application/x-shockwave-flash']);
			}
			return hasFlash;
		},
		isExitsFunction: function (funcName) {
			try {
				if (typeof(eval(funcName)) == "function") {
					return true;
				}
			} catch (e) {}
			return false;
		},
		clone: function (obj) {
			var o;
			if (typeof obj == "object") {
				if (obj === null) {
					o = null;
				} else {
					if (obj instanceof Array) {
						o = [];
						for (var i = 0, len = obj.length; i < len; i++) {
							o.push(this.clone(obj[i]));
						}
					} else {
						o = {};
						for (var j in obj) {
							o[j] = this.clone(obj[j]);
						}
					}
				}
			} else {
				o = obj;
			}
			return o;

		},
		isXPandFireFox: function () {
			var sUserAgent = navigator.userAgent;
			var isFirefox = navigator.userAgent.toUpperCase().indexOf("FIREFOX") ? true : false;
			var isXP = sUserAgent.indexOf("Windows NT 5.1") > -1 || sUserAgent.indexOf("Windows XP") > -1;
			return isXP && isFirefox;
		}

	};

	window.PlayerUtil = PlayerUtil;
})();
(function () {
	'use strict';

	var isCommonjs = typeof module !== 'undefined' && module.exports;
	var keyboardAllowed = typeof Element !== 'undefined' && 'ALLOW_KEYBOARD_INPUT' in Element;

	var fn = (function () {
		var val;
		var valLength;

		var fnMap = [
			[
				'requestFullscreen',
				'exitFullscreen',
				'fullscreenElement',
				'fullscreenEnabled',
				'fullscreenchange',
				'fullscreenerror'
			],
			// new WebKit
			[
				'webkitRequestFullscreen',
				'webkitExitFullscreen',
				'webkitFullscreenElement',
				'webkitFullscreenEnabled',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			// old WebKit (Safari 5.1)
			[
				'webkitRequestFullScreen',
				'webkitCancelFullScreen',
				'webkitCurrentFullScreenElement',
				'webkitCancelFullScreen',
				'webkitfullscreenchange',
				'webkitfullscreenerror'

			],
			[
				'mozRequestFullScreen',
				'mozCancelFullScreen',
				'mozFullScreenElement',
				'mozFullScreenEnabled',
				'mozfullscreenchange',
				'mozfullscreenerror'
			],
			[
				'msRequestFullscreen',
				'msExitFullscreen',
				'msFullscreenElement',
				'msFullscreenEnabled',
				'MSFullscreenChange',
				'MSFullscreenError'
			]
		];

		var i = 0;
		var l = fnMap.length;
		var ret = {};

		for (; i < l; i++) {
			val = fnMap[i];
			if (val && val[1]in document) {
				for (i = 0, valLength = val.length; i < valLength; i++) {
					ret[fnMap[0][i]] = val[i];
				}
				return ret;
			}
		}

		return false;
	})();

	var screenfull = {
		request: function (elem) {
			var request = fn.requestFullscreen;

			elem = elem || document.documentElement;

			// Work around Safari 5.1 bug: reports support for
			// keyboard in fullscreen even though it doesn't.
			// Browser sniffing, since the alternative with
			// setTimeout is even worse.
			if (/5\.1[\.\d]* Safari/.test(navigator.userAgent)) {
				elem[request]();
			} else {
				elem[request](keyboardAllowed && Element.ALLOW_KEYBOARD_INPUT);
			}
		},
		exit: function () {
			document[fn.exitFullscreen]();
		},
		toggle: function (elem) {
			if (this.isFullscreen) {
				this.exit();
			} else {
				this.request(elem);
			}
		},
		raw: fn
	};

	if (!fn) {
		if (isCommonjs) {
			module.exports = false;
		} else {
			window.screenfull = false;
		}

		return;
	}

	Object.defineProperties(screenfull, {
		isFullscreen: {
			get: function () {
				return Boolean(document[fn.fullscreenElement]);
			}
		},
		element: {
			enumerable: true,
			get: function () {
				return document[fn.fullscreenElement];
			}
		},
		enabled: {
			enumerable: true,
			get: function () {
				// Coerce to boolean in case of old WebKit
				return Boolean(document[fn.fullscreenEnabled]);
			}
		}
	});

	if (isCommonjs) {
		module.exports = screenfull;
	} else {
		window.screenfull = screenfull;
	}
})();
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

/*global window, require, define */
(function (_window) {
	'use strict';

	// Unique ID creation requires a high quality random # generator.  We feature
	// detect to determine the best RNG source, normalizing to a function that
	// returns 128-bits of randomness, since that's what's usually required
	var _rng,
	_mathRNG,
	_nodeRNG,
	_whatwgRNG,
	_previousRoot;

	function setupBrowser() {
		// Allow for MSIE11 msCrypto
		var _crypto = _window.crypto || _window.msCrypto;

		if (!_rng && _crypto && _crypto.getRandomValues) {
			// WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
			//
			// Moderately fast, high quality
			try {
				var _rnds8 = new Uint8Array(16);
				_whatwgRNG = _rng = function whatwgRNG() {
					_crypto.getRandomValues(_rnds8);
					return _rnds8;
				};
				_rng();
			} catch (e) {}
		}

		if (!_rng) {
			// Math.random()-based (RNG)
			//
			// If all else fails, use Math.random().  It's fast, but is of unspecified
			// quality.
			var _rnds = new Array(16);
			_mathRNG = _rng = function () {
				for (var i = 0, r; i < 16; i++) {
					if ((i & 0x03) === 0) {
						r = Math.random() * 0x100000000;
					}
					_rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
				}

				return _rnds;
			};
			if ('undefined' !== typeof console && console.warn) {
				console.warn("[SECURITY] node-uuid: crypto not usable, falling back to insecure Math.random()");
			}
		}
	}

	function setupNode() {
		// Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
		//
		// Moderately fast, high quality
		if ('function' === typeof require) {
			try {
				var _rb = require('crypto').randomBytes;
				_nodeRNG = _rng = _rb && function () {
					return _rb(16);
				};
				_rng();
			} catch (e) {}
		}
	}

	if (_window) {
		setupBrowser();
	} else {
		setupNode();
	}

	// Buffer class to use
	var BufferClass = ('function' === typeof Buffer) ? Buffer : Array;

	// Maps for number <-> hex string conversion
	var _byteToHex = [];
	var _hexToByte = {};
	for (var i = 0; i < 256; i++) {
		_byteToHex[i] = (i + 0x100).toString(16).substr(1);
		_hexToByte[_byteToHex[i]] = i;
	}

	// **`parse()` - Parse a UUID into it's component bytes**
	function parse(s, buf, offset) {
		var i = (buf && offset) || 0,
		ii = 0;

		buf = buf || [];
		s.toLowerCase().replace(/[0-9a-f]{2}/g, function (oct) {
			if (ii < 16) { // Don't overflow!
				buf[i + ii++] = _hexToByte[oct];
			}
		});

		// Zero out remaining bytes if string was short
		while (ii < 16) {
			buf[i + ii++] = 0;
		}

		return buf;
	}

	// **`unparse()` - Convert UUID byte array (ala parse()) into a string**
	function unparse(buf, offset) {
		var i = offset || 0,
		bth = _byteToHex;
		return bth[buf[i++]] + bth[buf[i++]] +
		bth[buf[i++]] + bth[buf[i++]] + '-' +
		bth[buf[i++]] + bth[buf[i++]] + '-' +
		bth[buf[i++]] + bth[buf[i++]] + '-' +
		bth[buf[i++]] + bth[buf[i++]] + '-' +
		bth[buf[i++]] + bth[buf[i++]] +
		bth[buf[i++]] + bth[buf[i++]] +
		bth[buf[i++]] + bth[buf[i++]];
	}

	// **`v1()` - Generate time-based UUID**
	//
	// Inspired by https://github.com/LiosK/UUID.js
	// and http://docs.python.org/library/uuid.html

	// random #'s we need to init node and clockseq
	var _seedBytes = _rng();

	// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
	var _nodeId = [
		_seedBytes[0] | 0x01,
		_seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
	];

	// Per 4.2.2, randomize (14 bit) clockseq
	var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

	// Previous uuid creation time
	var _lastMSecs = 0,
	_lastNSecs = 0;

	// See https://github.com/broofa/node-uuid for API details
	function v1(options, buf, offset) {
		var i = buf && offset || 0;
		var b = buf || [];

		options = options || {};

		var clockseq = (options.clockseq != null) ? options.clockseq : _clockseq;

		// UUID timestamps are 100 nano-second units since the Gregorian epoch,
		// (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
		// time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
		// (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
		var msecs = (options.msecs != null) ? options.msecs : new Date().getTime();

		// Per 4.2.1.2, use count of uuid's generated during the current clock
		// cycle to simulate higher resolution clock
		var nsecs = (options.nsecs != null) ? options.nsecs : _lastNSecs + 1;

		// Time since last uuid creation (in msecs)
		var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs) / 10000;

		// Per 4.2.1.2, Bump clockseq on clock regression
		if (dt < 0 && options.clockseq == null) {
			clockseq = clockseq + 1 & 0x3fff;
		}

		// Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
		// time interval
		if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
			nsecs = 0;
		}

		// Per 4.2.1.2 Throw error if too many uuids are requested
		if (nsecs >= 10000) {
			throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
		}

		_lastMSecs = msecs;
		_lastNSecs = nsecs;
		_clockseq = clockseq;

		// Per 4.1.4 - Convert from unix epoch to Gregorian epoch
		msecs += 12219292800000;

		// `time_low`
		var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
		b[i++] = tl >>> 24 & 0xff;
		b[i++] = tl >>> 16 & 0xff;
		b[i++] = tl >>> 8 & 0xff;
		b[i++] = tl & 0xff;

		// `time_mid`
		var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
		b[i++] = tmh >>> 8 & 0xff;
		b[i++] = tmh & 0xff;

		// `time_high_and_version`
		b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
		b[i++] = tmh >>> 16 & 0xff;

		// `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
		b[i++] = clockseq >>> 8 | 0x80;

		// `clock_seq_low`
		b[i++] = clockseq & 0xff;

		// `node`
		var node = options.node || _nodeId;
		for (var n = 0; n < 6; n++) {
			b[i + n] = node[n];
		}

		return buf ? buf : unparse(b);
	}

	// **`v4()` - Generate random UUID**

	// See https://github.com/broofa/node-uuid for API details
	function v4(options, buf, offset) {
		// Deprecated - 'format' argument, as supported in v1.2
		var i = buf && offset || 0;

		if (typeof(options) === 'string') {
			buf = (options === 'binary') ? new BufferClass(16) : null;
			options = null;
		}
		options = options || {};

		var rnds = options.random || (options.rng || _rng)();

		// Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
		rnds[6] = (rnds[6] & 0x0f) | 0x40;
		rnds[8] = (rnds[8] & 0x3f) | 0x80;

		// Copy bytes to buffer, if provided
		if (buf) {
			for (var ii = 0; ii < 16; ii++) {
				buf[i + ii] = rnds[ii];
			}
		}

		return buf || unparse(rnds);
	}

	// Export public API
	var uuid = v4;
	uuid.v1 = v1;
	uuid.v4 = v4;
	uuid.parse = parse;
	uuid.unparse = unparse;
	uuid.BufferClass = BufferClass;
	uuid._rng = _rng;
	uuid._mathRNG = _mathRNG;
	uuid._nodeRNG = _nodeRNG;
	uuid._whatwgRNG = _whatwgRNG;

	if (('undefined' !== typeof module) && module.exports) {
		// Publish as node.js module
		module.exports = uuid;
	} else if (typeof define === 'function' && define.amd) {
		// Publish as AMD module
		define(function () {
			return uuid;
		});

	} else {
		// Publish as global (in browsers)
		_previousRoot = _window.uuid;

		// **`noConflict()` - (browser only) to reset global 'uuid' var**
		uuid.noConflict = function () {
			_window.uuid = _previousRoot;
			return uuid;
		};

		_window.uuid = uuid;
	}
})('undefined' !== typeof window ? window : null);

//宽高
(function (window, document) {

	var html = document.documentElement;
	var body = document.body;

	var define = function (object, property, getter) {
		if (typeof object[property] === 'undefined') {
			Object.defineProperty(object, property, {
				get: getter
			});
		}
	};

	define(window, 'innerWidth', function () {
		return html.clientWidth
	});
	define(window, 'innerHeight', function () {
		return html.clientHeight
	});

	define(window, 'scrollX', function () {
		return window.pageXOffset || html.scrollLeft
	});
	define(window, 'scrollY', function () {
		return window.pageYOffset || html.scrollTop
	});

	define(document, 'width', function () {
		return Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, html.offsetWidth, body.clientWidth, html.clientWidth)
	});
	define(document, 'height', function () {
		return Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.offsetHeight, body.clientHeight, html.clientHeight)
	});

	return define;

}
	(window, document));

(function (vjs) {

	var vjsComponent = function (obj) {
		defaultComponent(obj);
		ctrlComponent(obj);
	};
	window.vjsComponent = vjsComponent;

	//默认项
	var defaultComponent = function (obj) {

		var $container = $("#" + obj.id);

		/**
		 * 设置播放器的默认层级
		 */
		// $container.css("z-index","9999");
		// $container.css("position","relative");
		// $container.children().css("z-index","9999");

		//屏蔽右键菜单的方法
		$container.on('contextmenu', function () {
			return false;
		});

	};

	//控制组件
	var ctrlComponent = function (obj) {

		var $video = $("#" + obj.id).children();
		var videoTitlez = "";
		if (obj.options.videoTitleTxt != null && obj.options.videoTitleTxt != "" && obj.options.videoTitleTxt != undefined) {
			videoTitlez = obj.options.videoTitleTxt;
		};

		var $videoArea = $('<div class="videoArea" style="width: 100%;height: 100%;z-index:1;position: absolute" ></div>');
		var $videoTitle = $('<div class="videoTitle" style="display:none;">' + videoTitlez + '</div>');
		var $ableControlBar = $('<div class="controlsBar" style="z-index: 2"></div>');
		$video.append($videoArea);
		$video.append($videoTitle);
		$video.append($ableControlBar);

		obj.$video = $video;
		obj.$videoArea = $videoArea;
		obj.$ableControlBar = $ableControlBar;
		obj.$videoTitle = $videoTitle;

		if (obj.options.mp3Mode) {
			$videoArea.css("backgroundColor", "#000");
		}

		// initDefiniArea(obj);//清晰度选项区
		initProgress(obj); //进度条
		initPlayBtn(obj); //播放器按钮
		initNext(obj); //下一节
		initTime(obj); //时间
		initRateBtn(obj); //速率
		initFull(obj); //全屏
		initDefini(obj); //清晰度
		initVolume(obj); //声音
		initTrack(obj); //字幕
		// initDanmu(obj);       //弹幕功能
		active(obj); //鼠标移动相关
		bindClick(obj);
		bindCallBack(obj);

	};

	//清晰度切换
	var initDefiniArea = function (obj) {

		var html = '<div class="definiArea"  style="z-index: 2">';
		html += '<div class="definiHead"><span>清晰度</span><b class="defCloseBtn"></b></div>';
		html += '<div class="definiLines">';
		html += '<div class="line1"><b class="line1gq"></b><b class="line1bq"></b></div>';
		// html+='<div class="line2"><span>线路二</span><b class="line2cq"></b></div>';
		html += '</div>';
		// html+='<div class="definiSpeedUp"><span>校内加速</span><b class="xiaonei"></b></div>';
		html += '</div>';
		obj.$video.append(html);

		if (obj.options.hasSchool) {
			$('.definiArea .line1').append('<b class="xiaonei"></b>');
		}

		///////////////////////////////默认值,事件相关处理///////////////////////////

		var containerId = obj.id;
		var $container = $("#" + containerId);
		var player = obj.player;
		var options = obj.options;
		var callback = obj.callback;

		$("#" + containerId + " .defCloseBtn").on("click", function () {
			$("#" + containerId + " .definiArea").hide();
		});

		var $line1bq = $("#" + containerId + " .line1bq");
		var $line1gq = $("#" + containerId + " .line1gq");
		// var $line1cq=$("#"+containerId+" .line1cq");
		// var $line2cq=$("#"+containerId+" .line2cq");
		var $xiaonei = $("#" + containerId + " .xiaonei");

		// if(options.schoolIp){


		// $line2cq.on("click",function () {
		// 	options.defini="line2cq";
		// 	player.dispose();//摧毁实例
		// 	$container.videojsPlayer(obj);
		// });

		// $xiaonei.on("click",function () {
		// 	options.defini="xiaonei";
		// 	player.dispose();//摧毁实例
		// 	$container.videojsPlayer(obj);
		// });


		// }else{
		// 	// $xiaonei.addClass("xiaoneioff");
		// 	// $line2cq.addClass("line2cq_1");
		// }

		// $line1bq.on("click",function () {
		// 	options.defini="line1bq";
		// 	toLetvPlayer(obj);
		// });

		// $line1gq.on("click",function () {
		// 	options.defini="line1gq";
		// 	toLetvPlayer(obj);
		// });

		// $line1cq.on("click",function () {
		// 	options.defini="line1cq";
		// 	toLetvPlayer(obj);
		// });


		//清晰度按钮高亮
		var lineArr = ['line1gq', 'line1bq', 'xiaonei'];
		$("#" + containerId + " b").removeClass("active");
		$("#" + containerId + " ." + lineArr[obj.options.chooseLine]).addClass("active");

		//切换清晰度
		$line1bq.on("click", function () {
			options.defini = "line1bq";
			player.dispose(); //摧毁实例

			for (var i = 0; i < obj.options.sourceSrc.lines.length; i++) {
				if (obj.options.sourceSrc.lines[i].lineName == '流畅') {
					obj.options.lineID = obj.options.sourceSrc.lines[i].lineID;
				}
			}
			switchSourses(obj);
		});

		$line1gq.on("click", function () {

			options.defini = "line1gq";
			player.dispose(); //摧毁实例

			for (var i = 0; i < obj.options.sourceSrc.lines.length; i++) {
				if (obj.options.sourceSrc.lines[i].lineName == '标准') {
					obj.options.lineID = obj.options.sourceSrc.lines[i].lineID;
				}
			}
			switchSourses(obj);
		});

		$xiaonei.on("click", function () {
			options.defini = "xiaonei";
			player.dispose(); //摧毁实例

			for (var i = 0; i < obj.options.sourceSrc.lines.length; i++) {
				if (obj.options.sourceSrc.lines[i].lineName == '校内') {
					obj.options.lineID = obj.options.sourceSrc.lines[i].lineID;
				}
			}
			switchSourses(obj);
		});

	};

	//进度条
	var initProgress = function (obj) {
		var html = '<div class="progress">';
		html += '<div class="progressBar">';
		html += '<div class="progressBall">';
		html += '<div class="progressNumber">00:00</div>';
		html += '</div>';
		html += '<div class="passTime"></div>';
		html += '</div>';
		html += '</div>';

		obj.$ableControlBar.append(html);

		////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		var containerId = obj.id;
		var player = obj.player;

		var $progress = $("#" + containerId + " .progress");
		var $progressBar = $("#" + containerId + " .progressBar");
		var $progressBall = $("#" + containerId + " .progressBall");
		var $progressNumber = $("#" + containerId + " .progressNumber");
		var $passTime = $("#" + containerId + " .passTime");
		var $playButton = $("#" + containerId + " #playButton");
		var $bigPlayButton = $("#" + containerId + " .bigPlayButton");
		var totalLength;

		//时间改变时自动改变进度条
		player.on("timeupdate", function (event) {
			if (!$progressNumber.is(':visible')) {
				var duration = parseInt(player.duration());
				var currentTime = parseInt(player.currentTime());
				var left = currentTime / duration * 100;
				totalLength = $("#" + obj.id).width();
				var barLeft = (currentTime / duration) * (totalLength - $progressBall.width());
				$progressBall.css("left", barLeft + "px");
				$passTime.css("width", left + "%");
			}
		});

		//点击进度条
		$progress.on("mousedown", function (event) {

			var left = event.pageX - $progressBar.offset().left - parseInt($progressBall.css("width")) / 2;
			var moveArea = parseInt($progressBar.css("width")) - parseInt($progressBall.css("width"));

			var oldTime = player.currentTime();
			obj.options.progressOldTime = oldTime;
			//跳转到点击的时间点
			var currentTime = left / moveArea * player.duration();
			player.currentTime(currentTime);

			//显示点击当前进度
			// PlayerUtil.log(Math.round(currentTime));
			$progressNumber.html(PlayerUtil.parseSeconds(Math.round(currentTime)));
			$progressNumber.show();

			//点击进度条即开始播放
			$playButton.attr("class", "pauseButton");
			$bigPlayButton.hide();
			var rate = player.playbackRate();
			player.play();
			player.playbackRate(rate);

			if (left <= 0) {
				$progressBall.css("left", "0px");
			} else if (left > moveArea) {
				$progressBall.css("left", moveArea + "px");
				$passTime.css("width", $progressBar.css("width"));
			} else {
				$progressBall.css("left", left + "px");
				$passTime.css("width", left);
			}
		});

		//点击进度条离开后
		$progress.on("mouseup", function (event) {
			var left = event.pageX - $progressBar.offset().left - parseInt($progressBall.css("width")) / 2;
			var moveArea = parseInt($progressBar.css("width")) - parseInt($progressBall.css("width"));
			//跳转到点击的时间点
			var currentTime = left / moveArea * player.duration();
			MonitorUtil.saveAction(obj, "drag", obj.options.progressOldTime, currentTime);
			$progressNumber.hide();
		});

		//滑动进度条
		$progressBall.on("mousedown", function () {
			var oldTime = player.currentTime();
			obj.options.progressOldTime = oldTime;
			$(document).on("mousemove.progressBar", function (event) {

				var left = event.pageX - $progressBar.offset().left - parseInt($progressBall.css("width")) / 2;
				var moveArea = parseInt($progressBar.css("width")) - parseInt($progressBall.css("width"));
				$progressNumber.show();

				if (left <= 0) {
					$progressBall.css("left", "0px");
				} else if (left > moveArea) {
					$progressBall.css("left", moveArea + "px");
					$passTime.css("width", $progressBar.css("width"));
				} else {
					var currentTimeStr = PlayerUtil.parseSeconds(Math.round(left / moveArea * player.duration()));
					$progressNumber.html(currentTimeStr);
					$progressBall.css("left", left + "px");
					$passTime.css("width", left);
				}
			});
			$(document).on("mouseup.progressBar", function (event) {

				var left = event.pageX - $progressBar.offset().left - parseInt($progressBall.css("width")) / 2;
				var moveArea = parseInt($progressBar.css("width")) - parseInt($progressBall.css("width"));
				player.currentTime(left / moveArea * player.duration());

				$progressNumber.hide();
				$(document).off(".progressBar");
			});
		});

	};

	//播放按钮
	var initPlayBtn = function (obj) {

		var html = '<div id="playButton" class="playButton pointer">';
		html += '<div class="bigPlayButton pointer"></div>';
		html += "</div>";
		obj.$ableControlBar.append(html);

		/////////////////////////////////////////////////////////////////////////////////////////

		var containerId = obj.id;
		var player = obj.player;
		var options = obj.options;

		var $playButton = $("#" + containerId + " #playButton");
		var $bigPlayButton = $("#" + containerId + " .bigPlayButton");

		if (options.autostart) {
			$playButton.attr("class", "pauseButton");
			$bigPlayButton.hide();
		} else {
			$playButton.attr("class", "playButton");
			if (options.control.bigPlayerBtn) {
				$bigPlayButton.show();
			} else {
				$bigPlayButton.hide();
			}
		}

		$playButton.on("click", function () {

			if (player.paused()) {
				$playButton.attr("class", "pauseButton");
				$bigPlayButton.hide();
				var rate = player.playbackRate();
				player.play();
				player.playbackRate(rate);
				MonitorUtil.saveAction(obj, "play");
			} else {
				$playButton.attr("class", "playButton");
				if (options.control.bigPlayerBtn) {
					$bigPlayButton.show();
				}
				player.pause();
				MonitorUtil.saveAction(obj, "pause");
			}

		});

	};

	var initNext = function (obj) {
		var html = '<div id="nextBtn" class="nextButton">';

		html += "</div>";
		obj.$ableControlBar.append(html);
		var containerId = obj.id;

		if (!obj.options.control.nextBtn) {
			$("#" + containerId + " #nextBtn").hide();
		}

		var $nextButton = $("#" + containerId + " #nextBtn");

		$nextButton.on("click", function () {

			if (typeof(obj.callback) != "undefined" && PlayerUtil.isExitsFunction(obj.callback.playerNext)) {
				PlayerUtil.log("next video");
				obj.callback.playerNext();
			}
		});

	}

	//时间
	var initTime = function (obj) {

		var html = '<div class="nPlayTime">';
		html += '<span class="currentTime">00:00:00</span>/<span class="duration">00:00:00</span>';
		html += "</div>";

		obj.$ableControlBar.append(html);

		////////////////////////////////////////////////////////////////////////////////////////////////////////

		var player = obj.player;
		var containerId = obj.id;

		// if(options.control.bigPlayerBtn){
		// 	$bigPlayButton.show();
		// }

		player.on("loadeddata", function () {
			var duration = parseInt(player.duration());
			duration = PlayerUtil.parseSeconds(duration);
			$("#" + containerId + " .duration").html(duration);

		});

		player.on("timeupdate", function () {
			var currentTime = parseInt(player.currentTime());
			currentTime = PlayerUtil.parseSeconds(currentTime);
			$("#" + containerId + " .currentTime").html(currentTime);
		});

	};

	//速率
	var initRateBtn = function (obj) {

		//如果播放器不支持video标签,则不显示速率按钮
		if (!PlayerUtil.supportVideo()) {
			return;
		}
		var html = '<div class="speedBox">';
		var isIncreaseRate = obj.options.isIncreaseRate;
		if (isIncreaseRate) {
			html += '<div class="speedList" style="top: -209px;height: 209px;">';
			html += '<div class="speedTab05" rate="1.0" ></div>';
			html += '<div class="speedTab10" rate="1.25" ></div>';
			html += '<div class="speedTab15" rate="1.5" ></div>';
			html += '<div class="speedTab20" rate="2.0" ></div>';
			html += '<div class="speedTab25" rate="2.5" ></div>';
			html += '<div class="speedTab30" rate="3.0" ></div>';
		} else {
			html += '<div class="speedList">';
			var isIncreaseRate = obj.options.isIncreaseRate;
			html += '<div class="speedTab05" rate="1.0" ></div>';
			html += '<div class="speedTab10" rate="1.25" ></div>';
			html += '<div class="speedTab15" style="margin-bottom:18px;" rate="1.5" ></div>';
		}
		html += '</div>';
		html += '</div>';
		html += '</div>';
		obj.$ableControlBar.append(html);

		////////////////////////////////////////////////////////////////////////////////////////////////////////
		var containerId = obj.id;
		var player = obj.player;
		var options = obj.options;

		var $speedList = $("#" + containerId + " .speedList");
		var $speedBox = $("#" + containerId + " .speedBox");

		if (!options.control.rateBtn) {
			$speedBox.hide();
		}

		$speedList.children().each(function (i, n) {
			var $this = $(n);
			$this.on("click", function () {
				var rate = $this.attr("rate");
				player.playbackRate(rate);

				options.rate = player.playbackRate();

				if (typeof(obj.callback) != "undefined" && PlayerUtil.isExitsFunction(obj.callback.playbackRate)) {
					obj.callback.playbackRate(player.playbackRate());
				}

				var img = $this.css("background-image");
				img = img.replace('-2.png', '.png');
				$speedBox.css("background-image", img);

				MonitorUtil.saveAction(obj, "changeRate");
			});

		});

		if (options.rate != null) {
			setTimeout(function () {
				player.playbackRate(options.rate);
			}, 100);
			$speedList.children().each(function (i, n) {
				var $this = $(n);
				var rate = $this.attr("rate");

				if (options.rate == rate) {
					var img = $this.css("background-image");
					img = img.replace('-2.png', '.png');
					$speedBox.css("background-image", img);
				}
			});
		}
	};

	//全屏
	var initFull = function (obj) {
		var html = '<div class="fullScreen"></div>';
		obj.$ableControlBar.append(html);

		///////////////////////////////////////////////////////////////////////////////////////////////////////////
		var containerId = obj.id;
		var player = obj.player;
		var options = obj.options;

		var $fullScreen = $("#" + containerId + " .fullScreen");

		if (!options.control.fullBtn) {
			$fullScreen.hide();
		}

		if (options.isFullscreen == undefined) {
			options.isFullscreen = 0; //是否全屏  默认否
		}

		$videoTitle = obj.$videoTitle;
		$fullScreen.on("click", function () {
			if (options.isFullscreen == 0) {
				MonitorUtil.saveAction(obj, "full")
				PlayerStarter.requestFullPlay(obj);
			} else {
				$videoTitle.hide();
				// MonitorUtil.saveAction(obj, "exitFull")
				PlayerStarter.exitFullPlay();
			}
			var trackSettings;

			if (window.isIE8 || window.isIE9) {
				trackSettings = {
					'backgroundOpacity': '0.5',
					'textOpacity': '1',
					'edgeStyle': 'dropshadow',
					'color': '#FFF',
					'backgroundColor': '#000',
					'fontPercent': 1
				};
			} else {
				trackSettings = {
					'backgroundOpacity': '0',
					'textOpacity': '1',
					'windowOpacity': '0',
					'edgeStyle': 'dropshadow',
					'color': '#FFF'
				};
			}
			obj.player.textTrackSettings.setValues(trackSettings);
			// PlayerStarter.resetControls(obj);
		});

	};

	//跳转到letv播放器
	var toLetvPlayer = function (obj) {
		PlayerStarter.exitFullPlay();
		obj.player.dispose();
		$("#" + obj.id).letvPlayer(obj);
	};

	//音量控制
	var initVolume = function (obj) {

		var html = '<div class="volumeBox">';
		html += '<div class="volumeIcon"></div>';
		html += '<div class="volumeBar">';
		html += '<div class="volumeBall">';
		html += '<div class="volumeNumber">0%</div>';
		html += '</div>';
		html += '<div class="passVolume"></div>';
		html += '</div>';
		html += '</div>';

		obj.$ableControlBar.append(html);
		///////////////////////////////////////////////////////////////////////////////////////////////////////////
		var options = obj.options;
		if (!options.control.volumeBtn) {
			$("#" + obj.id + " .volumeBox").hide();
		}

		setVolume(obj);
		iconClick(obj);
		volumeBallClick(obj);
		volumeBarClick(obj);

	};

	//设置默认音量
	var setVolume = function (obj) {

		var containerId = obj.id;
		var player = obj.player;
		var $volumeBall = $("#" + containerId + " .volumeBall");
		var $volumeBar = $("#" + containerId + " .volumeBar");
		var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));
		var defaultVolume = 0.5,
		Volume;

		if (obj.options.volume == undefined || obj.options.volume == 'undefined') {
			player.volume(defaultVolume); //默认音量50%
			Volume = defaultVolume;
		} else {
			player.volume(obj.options.volume);
			Volume = obj.options.volume;
			if (obj.options.volume == 0) {
				var $volumeBox = $("#" + containerId + " .volumeBox");
				$volumeBox.toggleClass("volumeNone");
			}
		}

		$volumeBall.css("left", moveArea * Volume + "px");
		$("#" + containerId + " .passVolume").css("width", moveArea * Volume);
	};

	//绑定音量图标点击事件
	var iconClick = function (obj) {

		var containerId = obj.id;
		var player = obj.player;

		var $volumeBall = $("#" + containerId + " .volumeBall");
		var $volumeBar = $("#" + containerId + " .volumeBar");
		var $volumeBox = $("#" + containerId + " .volumeBox");
		var $passVolume = $("#" + containerId + " .passVolume");
		var $volumeIcon = $("#" + containerId + " .volumeIcon");
		var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));
		var lastVolume = 0;
		var nowVolume = 0;
		$volumeIcon.on("click", function () {
			$volumeBox.toggleClass("volumeNone");
			nowVolume = player.volume();

			if (nowVolume == 0) {
				player.volume(lastVolume);
				$volumeBall.css("left", lastVolume * moveArea + "px");
				$passVolume.css("width", lastVolume * moveArea);
			} else {
				lastVolume = nowVolume;
				player.volume(0);
				$volumeBall.css("left", "0px");
				$passVolume.css("width", "0px");
			}
		});
	};

	//绑定音量滑动条
	var volumeBarClick = function (obj) {

		var containerId = obj.id;
		var player = obj.player;

		var $volumeBall = $("#" + containerId + " .volumeBall");
		var $volumeNumber = $("#" + containerId + " .volumeNumber");
		var $volumeBar = $("#" + containerId + " .volumeBar");
		var $volumeBox = $("#" + containerId + " .volumeBox");
		var $passVolume = $("#" + containerId + " .passVolume");

		$volumeBar.on("mousedown", function (event) {
			$volumeNumber.show();
			var left = event.pageX - $volumeBar.offset().left - parseInt($volumeBall.css("width")) / 2;
			var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));
			var vNum = left / moveArea;
			player.volume(vNum); //设置音量
			if (left <= 0) {
				$volumeBall.css("left", "0px");
				$volumeNumber.html("0%");
				$volumeBox.addClass("volumeNone");
			} else if (left > moveArea) {
				$volumeBall.css("left", moveArea + "px");
				$passVolume.css("width", $volumeBar.css("width"));
				$volumeNumber.html("100%");
				$volumeBox.removeClass("volumeNone");
			} else {
				$volumeBall.css("left", left + "px");
				$passVolume.css("width", left);
				$volumeNumber.html(Math.round(vNum * 100) + "%");
				$volumeBox.removeClass("volumeNone");
			}
		});

		$volumeBar.on("mouseup", function (event) {
			$volumeNumber.hide();
		});

	};

	//绑定音量滑动条
	var volumeBallClick = function (obj) {

		var containerId = obj.id;
		var player = obj.player;

		var $volumeBall = $("#" + containerId + " .volumeBall");
		var $volumeNumber = $("#" + containerId + " .volumeNumber");
		var $volumeBar = $("#" + containerId + " .volumeBar");
		var $volumeBox = $("#" + containerId + " .volumeBox");
		var $passVolume = $("#" + containerId + " .passVolume");

		$volumeBall.on("mousedown", function () {
			$(document).on("mousemove.volumeBar", function (event) {

				$volumeNumber.show();
				var left = event.pageX - $volumeBar.offset().left - parseInt($volumeBall.css("width")) / 2;
				var moveArea = parseInt($volumeBar.css("width")) - parseInt($volumeBall.css("width"));

				var vNum = left / moveArea;
				player.volume(vNum); //设置音量

				if (left <= 0) {
					$volumeBall.css("left", "0px");
					$volumeNumber.html("0%");
					$volumeBox.addClass("volumeNone");
				} else if (left > moveArea) {
					$volumeBall.css("left", moveArea + "px");
					$passVolume.css("width", $volumeBar.css("width"));
					$volumeNumber.html("100%");
					$volumeBox.removeClass("volumeNone");
				} else {
					$volumeBall.css("left", left + "px");
					$passVolume.css("width", left);
					$volumeNumber.html(Math.round(vNum * 100) + "%");
					$volumeBox.removeClass("volumeNone");
				}
			});
			$(document).on("mouseup.volumeBar", function () {

				$volumeNumber.hide();
				$(document).off(".volumeBar");
			});
		});
	};

	//清晰度
	var initDefini = function (obj) {

		var html = '<div class="definiBox">';
		html += '<div class="definiLines">';
		html += '<b class="line1gq"></b><b class="line1bq"></b>';
		html += '</div></div>';

		obj.$ableControlBar.append(html);
		$('.definiLines').hide();

		if (obj.options.hasSchool) {
			$('.definiLines').css({
				top: '-118px'
			});
			$("#" + obj.id + ' .definiLines').prepend('<b class="xiaonei"></b>');
		} else {
			$('.definiLines').css({
				top: '-87px'
			});
		}

		$('.definiBox').hover(function () {
			$(this).find(".definiLines").show();
		}, function () {
			$(this).find(".definiLines").hide();
		});

		if (!obj.options.control.definiBtn) {
			$("#" + obj.id + " .definiBox").hide();
		}

		var containerId = obj.id;
		var player = obj.player;
		var options = obj.options;
		var callback = obj.callback;

		var $line1bq = $("#" + containerId + " .line1bq");
		var $line1gq = $("#" + containerId + " .line1gq");
		// var $line1cq=$("#"+containerId+" .line1cq");
		// var $line2cq=$("#"+containerId+" .line2cq");
		var $xiaonei = $("#" + containerId + " .xiaonei");

		//清晰度按钮高亮
		var lineArr = ['line1gq', 'line1bq', 'xiaonei'];
		$("#" + containerId + " b").removeClass("active");
		$("#" + containerId + " ." + lineArr[obj.options.chooseLine]).addClass("active");
		$definiBox = $("#" + obj.id + " .definiBox");

		var img = $definiBox.css("background-image");
		img = img.substring(0, img.lastIndexOf("/") + 1);

		if (obj.options.chooseLine == 0) {
			$definiBox.css("background-image", "url(http://lc.zhihuishu.com/ableVideoPlayer/img/core/gaoqing_2.png)");
		}
		if (obj.options.chooseLine == 1) {
			$definiBox.css("background-image", "url(http://lc.zhihuishu.com/ableVideoPlayer/img/core/liuchang_2.png)");
		}
		if (obj.options.chooseLine == 2) {
			$definiBox.css("background-image", "url(http://lc.zhihuishu.com/ableVideoPlayer/img/core/xiaonei_2.png)");
		}
		// PlayerUtil.log($definiBox.css("background"));


		//切换清晰度
		$line1bq.on("click", function () {
			options.defini = "line1bq";
			options.volume = player.volume(); //记住音量
			options.vjsPaused = player.paused();
			player.dispose(); //摧毁实例
			for (var i = 0; i < obj.options.sourceSrc.lines.length; i++) {
				if (obj.options.sourceSrc.lines[i].lineName == '流畅') {
					obj.options.lineID = obj.options.sourceSrc.lines[i].lineID;
				}
			}
			MonitorUtil.saveAction(obj, "changeLine");
			switchSourses(obj);
		});

		$line1gq.on("click", function () {
			options.defini = "line1gq";
			options.volume = player.volume(); //记住音量
			options.vjsPaused = player.paused();
			player.dispose(); //摧毁实例
			for (var i = 0; i < obj.options.sourceSrc.lines.length; i++) {
				if (obj.options.sourceSrc.lines[i].lineName == '标准') {
					obj.options.lineID = obj.options.sourceSrc.lines[i].lineID;
				}
			}
			MonitorUtil.saveAction(obj, "changeLine");
			switchSourses(obj);
		});

		$xiaonei.on("click", function () {
			options.defini = "xiaonei";
			options.volume = player.volume(); //记住音量
			options.vjsPaused = player.paused();
			player.dispose(); //摧毁实例

			for (var i = 0; i < obj.options.sourceSrc.lines.length; i++) {
				if (obj.options.sourceSrc.lines[i].lineName == '校内') {
					obj.options.lineID = obj.options.sourceSrc.lines[i].lineID;
				}
			}
			MonitorUtil.saveAction(obj, "changeLine");
			switchSourses(obj);
		});

		////////////////////////////////////////////////////////////////////////

		// var containerId=obj.id;
		// var $definiBox=$("#"+containerId+" .definiBox");

		// if(!obj.options.control.definiBtn){
		// 	$definiBox.hide();
		// }

		// $definiBox.on("click",function () {
		// 	$("#"+containerId+" .definiArea").toggle();
		// });
	};

	var switchSourses = function (chosen) {

		chosen.options.videotype = 1; //判断视频是否为第一次加载,是第一次为undifined, 否则为1;
		$.ajax({
			url: "http://video.base.zhihuishu.com/video/changeVideoLine",
			data: {
				"videoID": chosen.options.id,
				"lineID": chosen.options.lineID,
				"uuid": chosen.options.sourceSrc.uuid
			}, //104105直播
			dataType: "jsonp",
			async: false,
			jsonp: "jsonpCallBack", //传递给请求处理程序或页面的，用以获得jsonp回调函数名的参数名(默认为:callback)
			jsonpCallback: "result", //自定义的jsonp回调函数名称，默认为jQuery自动生成的随机函数名
			success: function (data) {

				var containerId = chosen.id;
				var $container = $("#" + containerId);
				chosen.options.src = data.result;

				//选择清晰度高亮按钮
				for (var i = 0; i < chosen.options.sourceSrc.lines.length; i++) {
					if (chosen.options.sourceSrc.lines[i].lineID == chosen.options.lineID) {
						chosen.options.chooseLine = i;
					}
				}

				// if(chosen.options.defini!=null){
				// 	$("#"+containerId+" ."+chosen.options.defini).addClass(chosen.options.defini+"_1");
				// }
				PlayerUtil.log('切换请求视频源' + chosen.options.src);
				$container.videojsPlayer(chosen);

			},
			error: function (e) {
				PlayerUtil.log("err");
			}
		});

	}

	//字幕
	var initTrack = function (obj) {

		var html = '<div class="commonBox">';
		html += '<div class="trackList">';
		// html+='<div class="speedTab">中英文</div>';
		// html+='<div class="speedTab">英文</div>';
		// html+='<div class="speedTab">中文</div>';
		html += '</div>';
		html += '</div>';
		obj.$ableControlBar.append(html);

		/////////////////////////////////////////////////////////////////////////////////////////////

		if (!obj.options.control.trackBtn) {
			$("#" + obj.id + " .commonBox").hide();
		}

		addTrack(obj);
		bindTrack(obj);

	};

	var addTrack = function (obj) {

		var containerId = obj.id;
		var options = obj.options;
		var player = obj.player;

		var $commonBox = $("#" + containerId + " .commonBox");
		var $trackList = $("#" + containerId + " .trackList");

		if (options.track == null || options.track.length < 1) {
			$commonBox.hide();
			options.control.trackBtn = false;
		} else {

			if (options.track.length == 1) {
				$trackList.css("top", "-55px");
				if (options.track[0].language == 1) {
					var img = $commonBox.css("background-image");
					img = img.substring(0, img.lastIndexOf("/") + 1);
					$commonBox.css("background-image", img + "en.png");
				};
			}

			$(options.track).each(function (index, element) {

				var language = options.track[index].language;

				var lable;
				if (language == "0") { //中文
					language = "zh";
					lable = "中文";
				}
				if (language == "1") { //英文
					language = "en";
					lable = "英文";
				}
				if (language == "2") { //中英文
					return true;
					// language="zhen";
					// lable="中英文";
				}

				// $trackList.append('<div class="speedTab" language="'+language+'">'+lable+'</div>');
				$trackList.append('<div class="speedTab' + language + '" language="' + language + '"></div>');
				var trackOption = {
					"kind": "subtitles",
					"lable": lable,
					"language": language,
					"srclang": language,
					"src": options.track[index].src
					// "src":"http://miaomiaocafe.oss-cn-hangzhou.aliyuncs.com/en.vtt"
				};
				player.addRemoteTextTrack(trackOption);

			});
		}
	};

	var bindTrack = function (obj) {
		var containerId = obj.id;
		var options = obj.options;

		var $commonBox = $("#" + containerId + " .commonBox");
		var $trackList = $("#" + containerId + " .trackList");

		$trackList.children().each(function (i, n) {
			var $this = $(n);

			//默认显示中文字幕
			if (options.language == undefined || options.language == "undefined") {
				if (i > 0) {
					if ($this.attr("language") == 'zh') {
						changeTrack($this.attr("language"), obj);
					}
				} else {
					changeTrack($this.attr("language"), obj);
				};

			} else {
				changeTrack(options.language, obj);
			}

			//绑定点击事件
			$this.on("click", function () {
				changeTrack($this.attr("language"), obj);

				options.language = $this.attr("language");
				var img = $this.css("background-image");
				img = img.replace('-1.png', '.png');
				$commonBox.css("background-image", img);
			});
		});

		if (options.language != null) {
			$trackList.children().each(function (i, n) {
				var $this = $(n);
				if (options.language == $this.attr("language")) {
					$this.trigger("click");
				}
			});
		}
	};

	//选择字幕
	var changeTrack = function (language, obj) {

		var tracks = obj.player.remoteTextTracks();
		for (var i = 0; i < tracks.length; i++) {
			var track = tracks[i];
			if (track.language === language) {
				track.mode = 'showing';
			} else {
				track.mode = 'hidden';
			}
		}
	};

	//弹幕开关
	var initDanmu = function (obj) {

		var html = '<div id="danmu" class="bulletSwitch bulletSwitchOn">';
		// html+='<div>弹幕</div>';
		// html+='<span></span>';
		html += '</div>';

		obj.$ableControlBar.append(html);

		/////////////////////////////////////////////////////////////////////////////////////

		var containerId = obj.id;

		if (!obj.options.control.danmuBtn) {
			$("#" + containerId + " #danmu").hide();
		}

		obj.$videoArea.addClass("container");
		obj.$videoArea.parent().addClass("abp");

		if (!window.isIE8) {
			obj.cm = new CommentManager(obj.$videoArea[0]);
			obj.cm.init();
			obj.cm.start();
		}

		$("#" + containerId + " #danmu").on("click", function () {
			var $_this = $(this);
			if ($_this.hasClass("bulletSwitchOn")) {
				$_this.removeClass("bulletSwitchOn");
				$_this.addClass("bulletSwitchOff");
				if (!window.isIE8) {
					obj.cm.clear();
				}
				return;
			}

			if ($_this.hasClass("bulletSwitchOff")) {
				$_this.removeClass("bulletSwitchOff");
				$_this.addClass("bulletSwitchOn");
				return;
			}
		});

	};

	//鼠标移动相关
	var active = function (obj) {

		if (obj.options.control.controlBar == 0) {
			return;
		}

		var containerId = obj.id;
		var $ableControlBar = obj.$ableControlBar;
		var $videoTitle = obj.$videoTitle;

		vjsExtend("useractive", containerId, function () {
			$ableControlBar.show();
			if (obj.options.isFullscreen == 1) {
				$videoTitle.show();
			} else {
				$videoTitle.hide();
			};
		});

		vjsExtend("userinactive", containerId, function () {
			$ableControlBar.slideUp();
			if (obj.options.isFullscreen == 1) {
				$videoTitle.slideUp();
			} else {
				$videoTitle.hide();
			};
		});
	};

	//绑定点击事件
	var bindClick = function (obj) {
		var timer = null;

		var containerId = obj.id;
		var $container = $("#" + containerId);
		var $videoArea = $("#" + containerId + " .videoArea");
		var player = obj.player;
		var options = obj.options;

		$videoArea.on("click", function () {

			clearTimeout(timer);
			timer = setTimeout(function () { //在单击事件中添加一个setTimeout()函数，设置单击事件触发的时间间隔
					var $playButton = $("#" + containerId + " #playButton");
					var $bigPlayButton = $("#" + containerId + " .bigPlayButton");

					if (player.paused()) {
						$playButton.attr("class", "pauseButton");
						$bigPlayButton.hide();
						var rate = player.playbackRate();
						player.play();
						player.playbackRate(rate);
						MonitorUtil.saveAction(obj, "play");
					} else {
						$playButton.attr("class", "playButton");
						if (options.control.bigPlayerBtn) {
							$bigPlayButton.show()
						}
						player.pause();
						MonitorUtil.saveAction(obj, "pause");
					}
				}, 300);

		});

		$videoArea.on("dblclick", function () {
			clearTimeout(timer);
			if (options.isFullscreen == 0) {
				MonitorUtil.saveAction(obj, "full");
				PlayerStarter.requestFullPlay(obj);
			} else {
				// MonitorUtil.saveAction(obj, "exitFull");
				PlayerStarter.exitFullPlay();
			}
		});

	};

	function bindCallBack(obj) {

		var containerId = obj.id;
		var player = obj.player;
		var options = obj.options;
		var $playButton = $("#" + containerId + " #playButton");
		var $bigPlayButton = $("#" + containerId + " .bigPlayButton");

		player.on("play", function (value) { //开始播放
			$playButton.attr("class", "pauseButton");
			$bigPlayButton.hide();

			$("#" + obj.id + " .ablePlayerError").remove();

			if (!window.isIE8) {
				// obj.cm.start();
			}
		});
		player.on("pause", function (value) { //停止播放
			$playButton.attr("class", "playButton");
			if (options.control.bigPlayerBtn) {
				$bigPlayButton.show();
			} else {
				$bigPlayButton.hide();
			}
			if (!window.isIE8) {
				// obj.cm.stop();
			}
		});

		player.on("ended", function (value) { //播放结束
			$playButton.attr("class", "playButton");
			if (options.control.bigPlayerBtn) {
				$bigPlayButton.show()
			} else {
				$bigPlayButton.hide();
			}
		});

	}

	/////////////////////////////////////////////////对外提供的API////////////////////////////////////////////////////

	function vjsAPI(obj) {
		this.obj = obj;
	}

	vjsAPI.prototype = {

		seek: function (second) {
			try {
				PlayerUtil.log("seek:" + second);
				this.obj.player.currentTime(second);
			} catch (e) {
				PlayerUtil.log("vjs跳转进度失败!");
			}
		},
		setFullscreen: function (bool) {},
		play: function () {
			try {
				this.obj.player.play();
			} catch (e) {
				PlayerUtil.log("vjs播放失败!");
			}

		},
		pause: function () {
			try {
				this.obj.player.pause();
			} catch (e) {
				PlayerUtil.log("vjs暂停失败!");
			}

		},
		getDuration: function () {
			try {
				// console.log("allTime:"+this.obj.player.duration());
				return this.obj.player.duration();
			} catch (e) {
				PlayerUtil.log("vjs获取视频时长失败!");
			}

		},
		getPosition: function () {
			try {
				// console.log("currentTime:"+this.obj.player.currentTime());
				return this.obj.player.currentTime();
			} catch (e) {
				PlayerUtil.log("vjs获取当前播放进度失败!");
			}
		},
		addCourseInfo: function (info) {

			try {
				this.obj.courseInfo = $.extend(this.obj.courseInfo, info);
			} catch (e) {
				PlayerUtil.log("vjs添加课程信息失败!");
			}

		},
		dispose: function () {
			try {
				this.obj.player.dispose(); //摧毁实例
				PlayerStarter.del(this.obj.id);
			} catch (e) {
				PlayerUtil.log("vjs销毁实例失败!");
			}
		},
		getFullStatus: function () { //获取全屏状态   false:非全屏   true:全屏

			try {
				return this.obj.options.isFullscreen != 0;

			} catch (e) {
				PlayerUtil.log("vjs获取全屏状态失败!");
			}

		},
		exitFullPlay: function () { //退出全屏

			try {
				PlayerStarter.exitFullPlay();
			} catch (e) {
				PlayerUtil.log("vjs退出全屏失败!");
			}

		},
		resize: function (width, height) { //动态改变播放器的大小

			try {
				if (!this.getFullStatus()) {
					var $container = $("#" + this.obj.id);
					$container.width(width);
					$container.height(height);
					PlayerStarter.resetControls(this.obj);
					if (!window.isIE8) {
						this.obj.cm.init();
					}
				}
			} catch (e) {
				PlayerUtil.log("vjs改变播放器大小失败!");
			}

		},
		insertPopup: function (htmlstr) {

			try {
				var $popup = $('<div class="ablePlayerPopup-container"><table class="tbl-pop"><tr><td align="center"><div class="reset-ele"></div></td></tr></table></div>');
				$popup.find(".reset-ele").append(htmlstr);
				var $container = $("#" + this.obj.id);
				$container.children("div :eq(0)").append($popup[0]);
			} catch (e) {
				PlayerUtil.log("vjs添加弹出层失败!");
			}

		},
		removePopup: function () {
			try {
				var $popup = $("#" + this.obj.id + " .ablePlayerPopup-container");
				$popup.remove();
			} catch (e) {
				PlayerUtil.log("vjs删除弹出层失败!");
			}
		},
		sendDanmu: function (msg) {

			try {
				if (this.obj.defOptions.control.danmuBtn && $("#" + this.obj.id + " #danmu").hasClass("bulletSwitchOn") && !window.isIE8) {
					var cm = this.obj.cm;
					var obj = cclUtil.getMsgObj(msg);
					cm.send(obj);
				}
			} catch (e) {

				PlayerUtil.log("vjs发送弹幕失败!");
			}

		}

	};

	window.vjsAPI = vjsAPI;

}
	());
(function () {

	//注册自有callback
	var vjsExtend = function (type, containerId, fn) {

		if (type == "userinactive") {
			userinactive(containerId, fn);
		} else if (type == "useractive") {
			useractive(containerId, fn);
		}

	};

	//静止回调
	var userinactive = function (containerId, fn) {
		var $container = $("#" + containerId);

		var lastX = 0;
		var lastY = 0;
		var checkX = 0;
		var checkY = 0;
		var maxtime = 3000; //自定义参数
		var interval = 500;
		var maxIntervalNum = maxtime / interval;
		var intervalNum = 0;

		$container.mousemove(function (e) {

			lastX = e.offsetX;
			lastY = e.offsetY;
		});

		setInterval(function () {
			if (checkX == lastX && checkY == lastY) {
				intervalNum++;
			} else {
				checkX = lastX;
				checkY = lastY;
				intervalNum = 1;
			}

			if (intervalNum == maxIntervalNum) {
				fn();
			}
		}, interval);

	};

	var useractive = function (containerId, fn) {

		$("#" + containerId).mousemove(function (e) {
			fn();
		});

	};

	window.vjsExtend = vjsExtend;
})();
(function () {

	$.fn.videojsPlayer = function (obj) {
		createPlayer(obj);
	};

	/**
	 * 创建播放器
	 * @returns {*}
	 */
	var createPlayer = function (obj) {

		obj.times.creatTime = new Date().getTime();

		videojs.options.flash.swf = "http://lc.zhihuishu.com/ableVideoPlayer/swf/5.10.7/video-js.swf";

		obj.currentPlayerType = PlayerStarter.playerTypes["vjs"];
		var options = obj.options;

		if (obj.options.id) {
			PlayerUtil.log("智慧树视频");
			load(obj);
		} else {
			PlayerUtil.log("非智慧树视频");
			initVideo(obj);
		}

	};

	/**
	 * 加载视频
	 */
	var load = function (obj) {

		if (obj.options.videotype == undefined || obj.options.videotype == 'undefined' || obj.options.videotype == null) {

			var options = obj.options;
			var $container = $("#" + obj.id);
			var ableMediaUrl = "http://video.base.zhihuishu.com/video/subtitle/?d=a&jsoncallback=?";
			var cdnSrc;
			var param = {
				id: options.id,
				host: ""
			};

			var initBool = false; //第二个接口调用为真,旨在只调用一次initVideo(obj);

			$.getJSON(ableMediaUrl, param, function (result) {

				if (result != null || result != "") {
					options.track = result;
				}
				if (initBool) {
					PlayerUtil.log("默认接入视频源:" + options.src);
					initVideo(obj);
				} else {
					initBool = true;
				}

			});

			$.ajax({
				url: 'http://video.base.zhihuishu.com/video/initVideo',
				data: {
					"videoID": options.id
				},
				dataType: "jsonp",
				async: false,
				jsonp: "jsonpCallBack", //传递给请求处理程序或页面的，用以获得jsonp回调函数名的参数名(默认为:callback)
				jsonpCallback: 'result', //自定义的jsonp回调函数名称，默认为jQuery自动生成的随机函数名
				success: function (data) {
					if (data.successful) {
						options.sourceSrc = data.result;

						options.hasSchool = false;

						for (var i = 0; i < options.sourceSrc.lines.length; i++) {
							if (options.sourceSrc.lines[i].lineDefault) {
								options.src = options.sourceSrc.lines[i].lineUrl;
								options.chooseLine = i; //清晰度按钮高亮默认线路

								options.rate = 1; //播放器速率,默认1
								options.isFullscreen = 0; //是否全屏  默认否
								PlayerUtil.log("请求默认源视频:" + options.src);
							}
							if (options.sourceSrc.lines[i].lineName == '校内') {
								options.hasSchool = true;
							}
						}

						if (initBool) {
							PlayerUtil.log("默认接入视频源:" + options.src);
							initVideo(obj);
						} else {
							initBool = true;
						}
						// initVideo(obj);

					} else {
						if (data.errorCode == '1001') {
							// showError(ablePlayer.player,'01','视频文件不存在!');
							PlayerStarter.showError(obj, "01", "视频文件不存在!");
						} else if (data.errorCode == '1002') {
							// showError(ablePlayer.player,'02','视频转码中,请稍后重试!');
							PlayerStarter.showError(obj, "02", "视频转码中,请稍后重试!");
						} else if (data.errorCode == '1003') {
							// showError(ablePlayer.player,'03','视频无法播放,请尝试切换其他线路!');
							PlayerStarter.showError(obj, "03", "视频无法播放,请尝试切换其他线路!");
						} else if (data.errorCode == '1004') {
							// showError(ablePlayer.player,'03','视频无法播放,请尝试切换其他线路!');
							PlayerStarter.showError(obj, "04", "视频异常!");
						}

						PlayerStarter.del(obj.id);
					}
				},
				error: function () {
					PlayerUtil.log("调取接口失败");
				}
			});
		} else {
			PlayerUtil.log('切换接入视频源' + obj.options.src);
			initVideo(obj);
		}
	};

	/**
	 * 获取校内加速视频url
	 * @param src
	 * @returns {number}  异常状况返回-1
	 */
	var getCDNSrc = function (obj) {

		var cdnSrc = -1;
		var maxcount = 3;
		var option = {};
		option["url"] = encodeURI(obj.options.src);
		option["max"] = maxcount;
		option["type"] = "url";

		$.jsonp({
			url: 'http://dispatch.cdnudns.com/dispatch/v2',
			data: option,
			callbackParameter: "callback",
			success: function (result) {
				if (result["Rt"]) {
					cdnSrc = result["Resources"][0];
					PlayerUtil.log("获取校内加速地址成功!" + cdnSrc);
					obj.src = cdnSrc;
					initVideo(obj);
					PlayerUtil.log("加载CDN视频!");
				} else {
					PlayerUtil.log("获取校内加速地址失败!");
					initVideo(obj);
					PlayerUtil.log("加载原视频!");
				}

			},
			error: function (xOptions, textStatus) {
				PlayerUtil.log("调用校内加速接口失败!");
				initVideo(obj);
				PlayerUtil.log("加载原视频!")
			}
		});

		/*$.ajax({
		url: "http://dispatch.cdnudns.com/dispatch/v2",
		data: option,
		async:false,
		dataType: "jsonp",
		success: function(result) {

		if(result["Rt"]){
		cdnSrc=result["Resources"][0];
		PlayerUtil.log("获取校内加速地址成功!"+cdnSrc);
		obj.src=cdnSrc;
		initVideo(obj);
		PlayerUtil.log("加载CDN视频!");


		}else{
		PlayerUtil.log("获取校内加速地址失败!");
		initVideo(obj);
		PlayerUtil.log("加载原视频!");
		}
		},
		error: function(){
		PlayerUtil.log("调用校内加速接口失败!");
		initVideo(obj);
		PlayerUtil.log("加载原视频!")
		}
		});*/
		return cdnSrc;
	};

	function initVideo(obj) {

		var vjsId = "vjs_" + obj.id;
		var options = obj.options;

		var videoDOM = $("<video/>", {
				"id": vjsId,
				"class": "video-js vjs-default-skin able-player-skin",
				poster: options.image
			});
		var errorHtml = '<p class="vjs-no-js">Sorry 您可能需要下载新版本的浏览器来支持html5并播放本视频. <br> 请下载如下浏览器: Firefox3.5+ 或 Chrome3+</p>';
		videoDOM.append(errorHtml);

		var $container = $("#" + obj.id);
		$container.html("").append(videoDOM);
		var vjsAutostart = options.autostart;
		if (!options.autostart && options.vjsPaused == false) {
			vjsAutostart = true;
		}

		var player = videojs(vjsId, {
				techOrder: PlayerUtil.supportVideo() ? ["html5", "flash"] : ["flash", "html5"],
				controls: false, //不显示动作条
				autoplay: vjsAutostart, //是否自动播放
				width: $container.width(),
				height: $container.height(),
				html5: {
					nativeTextTracks: false
				}
			}, function () { //Ready CallBack
				obj.player = this;
				afterInit(obj);
				this.src(obj.options.src);
				this.playbackRate(obj.options.rate);

				//切换清晰度判断视频状态
				if (options.isFullscreen == 0) {
					// PlayerStarter.exitFullPlay();
				} else {
					// PlayerStarter.requestFullPlay(obj);
				}

				PlayerStarter.resetControls(obj);

				try {
					$(document).on(screenfull.raw.fullscreenchange, function () {
						if (!screenfull.isFullscreen) {
							//退出全屏
							// PlayerStarter.requestFullPlay(obj);
						} else {
							//进入全屏
							// PlayerStarter.exitFullPlay();
						}
						PlayerStarter.resetControls(obj);
					});
				} catch (e) {}

			});

	}

	/**
	 * 初始化之后
	 */
	var afterInit = function (obj) {

		setTrack(obj);

		//注册自有回调
		// vjsExtend();

		//加载UI
		vjsComponent(obj);

		//设置回调
		vjsCallback(obj);

		recordSeek(obj);

		PlayerUtil.log("vjs播放器初始化完成!");
	};

	var setTrack = function (obj) {

		var trackSettings;

		if (window.isIE8 || window.isIE9) {
			trackSettings = {
				'backgroundOpacity': '0.5',
				'textOpacity': '1',
				'edgeStyle': 'dropshadow',
				'color': '#FFF',
				'backgroundColor': '#000',
				'fontPercent': 1
			};
		} else {
			trackSettings = {
				'backgroundOpacity': '0',
				'textOpacity': '1',
				'windowOpacity': '0',
				'edgeStyle': 'dropshadow',
				'color': '#FFF'
			};
		}
		obj.player.textTrackSettings.setValues(trackSettings);
	};

	//对外提供的回调事件
	var vjsCallback = function (obj) {

		var player = obj.player;
		var callback = obj.callback;

		player.on("play", function (value) { //开始播放
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onPlay)) {
				setTimeout(function () {
					callback.onPlay();
				}, 500);
			}
		});
		player.on("pause", function (value) { //停止播放
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onPause)) {
				callback.onPause();
			}
		});
		player.on("ended", function (value) { //播放结束
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onComplete)) {
				callback.onComplete();
				MonitorUtil.saveAction(obj, "exit");
			}
		});
		player.on("loadeddata", function (value) { //初始化完成
			obj.times.initEndTime = new Date().getTime();
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onReady)) {
				obj.options.waitingTime = 0;
				callback.onReady();
			}
		});
		player.on("timeupdate", function (value) { //播放进度改变
			if (obj.times.firstLoadTime == 0) {
				obj.times.firstLoadTime = new Date().getTime();
				MonitorUtil.videoLogBase(obj);
			}
			if (typeof(callback) != "undefined" && PlayerUtil.isExitsFunction(callback.onTime)) {
				callback.onTime(player.currentTime());
			}
			// console.log("onTime:"+player.currentTime());
		});

		player.on("error", function (value) { //出现错误
			$("#" + obj.id + " .vjs-error-display").remove();
			setTimeout(function () {
				if (player.paused()) {
					PlayerStarter.showError(obj, "03", "视频无法播放,请尝试切换其他线路!"); //网络异常或视频文件无法播放
				}
			}, 500)

		});
		player.on("waiting", function (value) {
			obj.options.waitingTime = new Date().getTime();
			obj.options.waitingPlayTime = player.currentTime();
			PlayerUtil.log("waiting" + value)
		});

		player.on("canplay", function (value) {
			if (obj.options.waitingTime > 0 && (new Date().getTime() - obj.options.waitingTime) > 0) {
				obj.options.kadun = new Date().getTime() - obj.options.waitingTime;
				PlayerUtil.log(obj.options.kadun);
				MonitorUtil.saveAction(obj, "kadun");
				obj.options.waitingTime = 0;
			}
		});

	};

	var recordSeek = function (obj) {
		var player = obj.player;
		var options = obj.options;

		var tempSeek = options.seek;
		if (options.seek > 2) {
			setTimeout(function () {
				player.currentTime(tempSeek);
			}, 1000);
		}

		player.on("timeupdate", function () {
			options.seek = player.currentTime();
		});
	};

})();
!function (a, b) {
	"undefined" == typeof a.HTMLVideoElement && (b.createElement("video"), b.createElement("audio"), b.createElement("track")),
	function (a, b) {
		"use strict";
		"function" == typeof define && define.amd ? define(b) : "object" == typeof exports ? module.exports = b() : a.returnExports = b()
	}
	(this, function () {
		var b,
		c = Array,
		d = c.prototype,
		e = Object,
		f = e.prototype,
		g = Function.prototype,
		h = String,
		i = h.prototype,
		j = Number,
		k = j.prototype,
		l = d.slice,
		m = d.splice,
		n = d.push,
		o = d.unshift,
		p = d.concat,
		q = g.call,
		r = Math.max,
		s = Math.min,
		t = f.toString,
		u = "function" == typeof Symbol && "symbol" == typeof Symbol.toStringTag,
		v = Function.prototype.toString,
		w = function (a) {
			try {
				return v.call(a),
				!0
			} catch (b) {
				return !1
			}
		},
		x = "[object Function]",
		y = "[object GeneratorFunction]";
		b = function (a) {
			if ("function" != typeof a)
				return !1;
			if (u)
				return w(a);
			var b = t.call(a);
			return b === x || b === y
		};
		var z,
		A = RegExp.prototype.exec,
		B = function (a) {
			try {
				return A.call(a),
				!0
			} catch (b) {
				return !1
			}
		},
		C = "[object RegExp]";
		z = function (a) {
			return "object" != typeof a ? !1 : u ? B(a) : t.call(a) === C
		};
		var D,
		E = String.prototype.valueOf,
		F = function (a) {
			try {
				return E.call(a),
				!0
			} catch (b) {
				return !1
			}
		},
		G = "[object String]";
		D = function (a) {
			return "string" == typeof a ? !0 : "object" != typeof a ? !1 : u ? F(a) : t.call(a) === G
		};
		var H = function (a) {
			var b,
			c = e.defineProperty && function () {
				try {
					var a = {};
					e.defineProperty(a, "x", {
						enumerable: !1,
						value: a
					});
					for (var b in a)
						return !1;
					return a.x === a
				} catch (c) {
					return !1
				}
			}
			();
			return b = c ? function (a, b, c, d) {
				!d && b in a || e.defineProperty(a, b, {
					configurable: !0,
					enumerable: !1,
					writable: !0,
					value: c
				})
			}
			 : function (a, b, c, d) {
				!d && b in a || (a[b] = c)
			},
			function (c, d, e) {
				for (var f in d)
					a.call(d, f) && b(c, f, d[f], e)
			}
		}
		(f.hasOwnProperty),
		I = function (a) {
			var b = typeof a;
			return null === a || "object" !== b && "function" !== b
		},
		J = j.isNaN || function (a) {
			return a !== a
		},
		K = {
			ToInteger: function (a) {
				var b = +a;
				return J(b) ? b = 0 : 0 !== b && b !== 1 / 0 && b !==  - (1 / 0) && (b = (b > 0 || -1) * Math.floor(Math.abs(b))),
				b
			},
			ToPrimitive: function (a) {
				var c,
				d,
				e;
				if (I(a))
					return a;
				if (d = a.valueOf, b(d) && (c = d.call(a), I(c)))
					return c;
				if (e = a.toString, b(e) && (c = e.call(a), I(c)))
					return c;
				throw new TypeError
			},
			ToObject: function (a) {
				if (null == a)
					throw new TypeError("can't convert " + a + " to object");
				return e(a)
			},
			ToUint32: function (a) {
				return a >>> 0
			}
		},
		L = function () {};
		H(g, {
			bind: function (a) {
				var c = this;
				if (!b(c))
					throw new TypeError("Function.prototype.bind called on incompatible " + c);
				for (var d, f = l.call(arguments, 1), g = function () {
					if (this instanceof d) {
						var b = c.apply(this, p.call(f, l.call(arguments)));
						return e(b) === b ? b : this
					}
					return c.apply(a, p.call(f, l.call(arguments)))
				}, h = r(0, c.length - f.length), i = [], j = 0; h > j; j++)
					n.call(i, "$" + j);
				return d = Function("binder", "return function (" + i.join(",") + "){ return binder.apply(this, arguments); }")(g),
				c.prototype && (L.prototype = c.prototype, d.prototype = new L, L.prototype = null),
				d
			}
		});
		var M = q.bind(f.hasOwnProperty),
		N = q.bind(f.toString),
		O = q.bind(i.slice),
		P = q.bind(i.split),
		Q = q.bind(i.indexOf),
		R = q.bind(n),
		S = c.isArray || function (a) {
			return "[object Array]" === N(a)
		},
		T = 1 !== [].unshift(0);
		H(d, {
			unshift: function () {
				return o.apply(this, arguments),
				this.length
			}
		}, T),
		H(c, {
			isArray: S
		});
		var U = e("a"),
		V = "a" !== U[0] || !(0 in U),
		W = function (a) {
			var b = !0,
			c = !0;
			return a && (a.call("foo", function (a, c, d) {
					"object" != typeof d && (b = !1)
				}), a.call([1], function () {
					"use strict";
					c = "string" == typeof this
				}, "x")),
			!!a && b && c
		};
		H(d, {
			forEach: function (a) {
				var c,
				d = K.ToObject(this),
				e = V && D(this) ? P(this, "") : d,
				f = -1,
				g = K.ToUint32(e.length);
				if (arguments.length > 1 && (c = arguments[1]), !b(a))
					throw new TypeError("Array.prototype.forEach callback must be a function");
				for (; ++f < g; )
					f in e && ("undefined" == typeof c ? a(e[f], f, d) : a.call(c, e[f], f, d))
			}
		}, !W(d.forEach)),
		H(d, {
			map: function (a) {
				var d,
				e = K.ToObject(this),
				f = V && D(this) ? P(this, "") : e,
				g = K.ToUint32(f.length),
				h = c(g);
				if (arguments.length > 1 && (d = arguments[1]), !b(a))
					throw new TypeError("Array.prototype.map callback must be a function");
				for (var i = 0; g > i; i++)
					i in f && ("undefined" == typeof d ? h[i] = a(f[i], i, e) : h[i] = a.call(d, f[i], i, e));
				return h
			}
		}, !W(d.map)),
		H(d, {
			filter: function (a) {
				var c,
				d,
				e = K.ToObject(this),
				f = V && D(this) ? P(this, "") : e,
				g = K.ToUint32(f.length),
				h = [];
				if (arguments.length > 1 && (d = arguments[1]), !b(a))
					throw new TypeError("Array.prototype.filter callback must be a function");
				for (var i = 0; g > i; i++)
					i in f && (c = f[i], ("undefined" == typeof d ? a(c, i, e) : a.call(d, c, i, e)) && R(h, c));
				return h
			}
		}, !W(d.filter)),
		H(d, {
			every: function (a) {
				var c,
				d = K.ToObject(this),
				e = V && D(this) ? P(this, "") : d,
				f = K.ToUint32(e.length);
				if (arguments.length > 1 && (c = arguments[1]), !b(a))
					throw new TypeError("Array.prototype.every callback must be a function");
				for (var g = 0; f > g; g++)
					if (g in e && !("undefined" == typeof c ? a(e[g], g, d) : a.call(c, e[g], g, d)))
						return !1;
				return !0
			}
		}, !W(d.every)),
		H(d, {
			some: function (a) {
				var c,
				d = K.ToObject(this),
				e = V && D(this) ? P(this, "") : d,
				f = K.ToUint32(e.length);
				if (arguments.length > 1 && (c = arguments[1]), !b(a))
					throw new TypeError("Array.prototype.some callback must be a function");
				for (var g = 0; f > g; g++)
					if (g in e && ("undefined" == typeof c ? a(e[g], g, d) : a.call(c, e[g], g, d)))
						return !0;
				return !1
			}
		}, !W(d.some));
		var X = !1;
		d.reduce && (X = "object" == typeof d.reduce.call("es5", function (a, b, c, d) {
					return d
				})),
		H(d, {
			reduce: function (a) {
				var c = K.ToObject(this),
				d = V && D(this) ? P(this, "") : c,
				e = K.ToUint32(d.length);
				if (!b(a))
					throw new TypeError("Array.prototype.reduce callback must be a function");
				if (0 === e && 1 === arguments.length)
					throw new TypeError("reduce of empty array with no initial value");
				var f,
				g = 0;
				if (arguments.length >= 2)
					f = arguments[1];
				else
					for (; ; ) {
						if (g in d) {
							f = d[g++];
							break
						}
						if (++g >= e)
							throw new TypeError("reduce of empty array with no initial value")
					}
				for (; e > g; g++)
					g in d && (f = a(f, d[g], g, c));
				return f
			}
		}, !X);
		var Y = !1;
		d.reduceRight && (Y = "object" == typeof d.reduceRight.call("es5", function (a, b, c, d) {
					return d
				})),
		H(d, {
			reduceRight: function (a) {
				var c = K.ToObject(this),
				d = V && D(this) ? P(this, "") : c,
				e = K.ToUint32(d.length);
				if (!b(a))
					throw new TypeError("Array.prototype.reduceRight callback must be a function");
				if (0 === e && 1 === arguments.length)
					throw new TypeError("reduceRight of empty array with no initial value");
				var f,
				g = e - 1;
				if (arguments.length >= 2)
					f = arguments[1];
				else
					for (; ; ) {
						if (g in d) {
							f = d[g--];
							break
						}
						if (--g < 0)
							throw new TypeError("reduceRight of empty array with no initial value")
					}
				if (0 > g)
					return f;
				do
					g in d && (f = a(f, d[g], g, c));
				while (g--);
				return f
			}
		}, !Y);
		var Z = d.indexOf && -1 !== [0, 1].indexOf(1, 2);
		H(d, {
			indexOf: function (a) {
				var b = V && D(this) ? P(this, "") : K.ToObject(this),
				c = K.ToUint32(b.length);
				if (0 === c)
					return -1;
				var d = 0;
				for (arguments.length > 1 && (d = K.ToInteger(arguments[1])), d = d >= 0 ? d : r(0, c + d); c > d; d++)
					if (d in b && b[d] === a)
						return d;
				return -1
			}
		}, Z);
		var $ = d.lastIndexOf && -1 !== [0, 1].lastIndexOf(0, -3);
		H(d, {
			lastIndexOf: function (a) {
				var b = V && D(this) ? P(this, "") : K.ToObject(this),
				c = K.ToUint32(b.length);
				if (0 === c)
					return -1;
				var d = c - 1;
				for (arguments.length > 1 && (d = s(d, K.ToInteger(arguments[1]))), d = d >= 0 ? d : c - Math.abs(d); d >= 0; d--)
					if (d in b && a === b[d])
						return d;
				return -1
			}
		}, $);
		var _ = function () {
			var a = [1, 2],
			b = a.splice();
			return 2 === a.length && S(b) && 0 === b.length
		}
		();
		H(d, {
			splice: function (a, b) {
				return 0 === arguments.length ? [] : m.apply(this, arguments)
			}
		}, !_);
		var aa = function () {
			var a = {};
			return d.splice.call(a, 0, 0, 1),
			1 === a.length
		}
		();
		H(d, {
			splice: function (a, b) {
				if (0 === arguments.length)
					return [];
				var c = arguments;
				return this.length = r(K.ToInteger(this.length), 0),
				arguments.length > 0 && "number" != typeof b && (c = l.call(arguments), c.length < 2 ? R(c, this.length - a) : c[1] = K.ToInteger(b)),
				m.apply(this, c)
			}
		}, !aa);
		var ba = function () {
			var a = new c(1e5);
			return a[8] = "x",
			a.splice(1, 1),
			7 === a.indexOf("x")
		}
		(),
		ca = function () {
			var a = 256,
			b = [];
			return b[a] = "a",
			b.splice(a + 1, 0, "b"),
			"a" === b[a]
		}
		();
		H(d, {
			splice: function (a, b) {
				for (var c, d = K.ToObject(this), e = [], f = K.ToUint32(d.length), g = K.ToInteger(a), i = 0 > g ? r(f + g, 0) : s(g, f), j = s(r(K.ToInteger(b), 0), f - i), k = 0; j > k; )
					c = h(i + k), M(d, c) && (e[k] = d[c]), k += 1;
				var m,
				n = l.call(arguments, 2),
				o = n.length;
				if (j > o) {
					for (k = i; f - j > k; )
						c = h(k + j), m = h(k + o), M(d, c) ? d[m] = d[c] : delete d[m], k += 1;
					for (k = f; k > f - j + o; )
						delete d[k - 1], k -= 1
				} else if (o > j)
					for (k = f - j; k > i; )
						c = h(k + j - 1), m = h(k + o - 1), M(d, c) ? d[m] = d[c] : delete d[m], k -= 1;
				k = i;
				for (var p = 0; p < n.length; ++p)
					d[k] = n[p], k += 1;
				return d.length = f - j + o,
				e
			}
		}, !ba || !ca);
		var da = "1,2" !== [1, 2].join(void 0),
		ea = d.join;
		H(d, {
			join: function (a) {
				return ea.call(this, "undefined" == typeof a ? "," : a)
			}
		}, da);
		var fa = function (a) {
			for (var b = K.ToObject(this), c = K.ToUint32(b.length), d = 0; d < arguments.length; )
				b[c + d] = arguments[d], d += 1;
			return b.length = c + d,
			c + d
		},
		ga = function () {
			var a = {},
			b = Array.prototype.push.call(a, void 0);
			return 1 !== b || 1 !== a.length || "undefined" != typeof a[0] || !M(a, 0)
		}
		();
		H(d, {
			push: function (a) {
				return S(this) ? n.apply(this, arguments) : fa.apply(this, arguments)
			}
		}, ga);
		var ha = function () {
			var a = [],
			b = a.push(void 0);
			return 1 !== b || 1 !== a.length || "undefined" != typeof a[0] || !M(a, 0)
		}
		();
		H(d, {
			push: fa
		}, ha);
		var ia = !{
			toString: null
		}
		.propertyIsEnumerable("toString"),
		ja = function () {}
		.propertyIsEnumerable("prototype"),
		ka = !M("x", "0"),
		la = function (a) {
			var b = a.constructor;
			return b && b.prototype === a
		},
		ma = {
			$window: !0,
			$console: !0,
			$parent: !0,
			$self: !0,
			$frame: !0,
			$frames: !0,
			$frameElement: !0,
			$webkitIndexedDB: !0,
			$webkitStorageInfo: !0
		},
		na = function () {
			if ("undefined" == typeof a)
				return !1;
			for (var b in a)
				try {
					!ma["$" + b] && M(a, b) && null !== a[b] && "object" == typeof a[b] && la(a[b])
				} catch (c) {
					return !0
				}
			return !1
		}
		(),
		oa = function (b) {
			if ("undefined" == typeof a || !na)
				return la(b);
			try {
				return la(b)
			} catch (c) {
				return !1
			}
		},
		pa = ["toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "constructor"],
		qa = pa.length,
		ra = function (a) {
			return "[object Arguments]" === N(a)
		},
		sa = function (a) {
			return null !== a && "object" == typeof a && "number" == typeof a.length && a.length >= 0 && !S(a) && b(a.callee)
		},
		ta = ra(arguments) ? ra : sa;
		H(e, {
			keys: function (a) {
				var c = b(a),
				d = ta(a),
				e = null !== a && "object" == typeof a,
				f = e && D(a);
				if (!e && !c && !d)
					throw new TypeError("Object.keys called on a non-object");
				var g = [],
				i = ja && c;
				if (f && ka || d)
					for (var j = 0; j < a.length; ++j)
						R(g, h(j));
				if (!d)
					for (var k in a)
						i && "prototype" === k || !M(a, k) || R(g, h(k));
				if (ia)
					for (var l = oa(a), m = 0; qa > m; m++) {
						var n = pa[m];
						l && "constructor" === n || !M(a, n) || R(g, n)
					}
				return g
			}
		});
		var ua = e.keys && function () {
			return 2 === e.keys(arguments).length
		}
		(1, 2),
		va = e.keys && function () {
			var a = e.keys(arguments);
			return 1 !== arguments.length || 1 !== a.length || 1 !== a[0]
		}
		(1),
		wa = e.keys;
		H(e, {
			keys: function (a) {
				return wa(ta(a) ? l.call(a) : a)
			}
		}, !ua || va);
		var xa = -621987552e5,
		ya = "-000001",
		za = Date.prototype.toISOString && -1 === new Date(xa).toISOString().indexOf(ya),
		Aa = Date.prototype.toISOString && "1969-12-31T23:59:59.999Z" !== new Date(-1).toISOString();
		H(Date.prototype, {
			toISOString: function () {
				var a,
				b,
				c,
				d,
				e;
				if (!isFinite(this))
					throw new RangeError("Date.prototype.toISOString called on non-finite value.");
				for (d = this.getUTCFullYear(), e = this.getUTCMonth(), d += Math.floor(e / 12), e = (e % 12 + 12) % 12, a = [e + 1, this.getUTCDate(), this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()], d = (0 > d ? "-" : d > 9999 ? "+" : "") + O("00000" + Math.abs(d), d >= 0 && 9999 >= d ? -4 : -6), b = a.length; b--; )
					c = a[b], 10 > c && (a[b] = "0" + c);
				return d + "-" + l.call(a, 0, 2).join("-") + "T" + l.call(a, 2).join(":") + "." + O("000" + this.getUTCMilliseconds(), -3) + "Z"
			}
		}, za || Aa);
		var Ba = function () {
			try {
				return Date.prototype.toJSON && null === new Date(NaN).toJSON() && -1 !== new Date(xa).toJSON().indexOf(ya) && Date.prototype.toJSON.call({
					toISOString: function () {
						return !0
					}
				})
			} catch (a) {
				return !1
			}
		}
		();
		Ba || (Date.prototype.toJSON = function (a) {
			var c = e(this),
			d = K.ToPrimitive(c);
			if ("number" == typeof d && !isFinite(d))
				return null;
			var f = c.toISOString;
			if (!b(f))
				throw new TypeError("toISOString property is not callable");
			return f.call(c)
		});
		var Ca = 1e15 === Date.parse("+033658-09-27T01:46:40.000Z"),
		Da = !isNaN(Date.parse("2012-04-04T24:00:00.500Z")) || !isNaN(Date.parse("2012-11-31T23:59:59.000Z")) || !isNaN(Date.parse("2012-12-31T23:59:60.000Z")),
		Ea = isNaN(Date.parse("2000-01-01T00:00:00.000Z"));
		if (Ea || Da || !Ca) {
			var Fa = Math.pow(2, 31) - 1,
			Ga = (Math.floor(Fa / 1e3), J(new Date(1970, 0, 1, 0, 0, 0, Fa + 1).getTime()));
			Date = function (a) {
				var b = function (c, d, e, f, g, i, j) {
					var k,
					l = arguments.length;
					if (this instanceof a) {
						var m = i,
						n = j;
						if (Ga && l >= 7 && j > Fa) {
							var o = Math.floor(j / Fa) * Fa,
							p = Math.floor(o / 1e3);
							m += p,
							n -= 1e3 * p
						}
						k = 1 === l && h(c) === c ? new a(b.parse(c)) : l >= 7 ? new a(c, d, e, f, g, m, n) : l >= 6 ? new a(c, d, e, f, g, m) : l >= 5 ? new a(c, d, e, f, g) : l >= 4 ? new a(c, d, e, f) : l >= 3 ? new a(c, d, e) : l >= 2 ? new a(c, d) : l >= 1 ? new a(c) : new a
					} else
						k = a.apply(this, arguments);
					return I(k) || H(k, {
						constructor: b
					}, !0),
					k
				},
				c = new RegExp("^(\\d{4}|[+-]\\d{6})(?:-(\\d{2})(?:-(\\d{2})(?:T(\\d{2}):(\\d{2})(?::(\\d{2})(?:(\\.\\d{1,}))?)?(Z|(?:([-+])(\\d{2}):(\\d{2})))?)?)?)?$"),
				d = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365],
				e = function (a, b) {
					var c = b > 1 ? 1 : 0;
					return d[b] + Math.floor((a - 1969 + c) / 4) - Math.floor((a - 1901 + c) / 100) + Math.floor((a - 1601 + c) / 400) + 365 * (a - 1970)
				},
				f = function (b) {
					var c = 0,
					d = b;
					if (Ga && d > Fa) {
						var e = Math.floor(d / Fa) * Fa,
						f = Math.floor(e / 1e3);
						c += f,
						d -= 1e3 * f
					}
					return j(new a(1970, 0, 1, 0, 0, c, d))
				};
				for (var g in a)
					M(a, g) && (b[g] = a[g]);
				H(b, {
					now: a.now,
					UTC: a.UTC
				}, !0),
				b.prototype = a.prototype,
				H(b.prototype, {
					constructor: b
				}, !0);
				var i = function (b) {
					var d = c.exec(b);
					if (d) {
						var g,
						h = j(d[1]),
						i = j(d[2] || 1) - 1,
						k = j(d[3] || 1) - 1,
						l = j(d[4] || 0),
						m = j(d[5] || 0),
						n = j(d[6] || 0),
						o = Math.floor(1e3 * j(d[7] || 0)),
						p = Boolean(d[4] && !d[8]),
						q = "-" === d[9] ? 1 : -1,
						r = j(d[10] || 0),
						s = j(d[11] || 0),
						t = m > 0 || n > 0 || o > 0;
						return (t ? 24 : 25) > l && 60 > m && 60 > n && 1e3 > o && i > -1 && 12 > i && 24 > r && 60 > s && k > -1 && k < e(h, i + 1) - e(h, i) && (g = 60 * (24 * (e(h, i) + k) + l + r * q), g = 1e3 * (60 * (g + m + s * q) + n) + o, p && (g = f(g)), g >= -864e13 && 864e13 >= g) ? g : NaN
					}
					return a.parse.apply(this, arguments)
				};
				return H(b, {
					parse: i
				}),
				b
			}
			(Date)
		}
		Date.now || (Date.now = function () {
			return (new Date).getTime()
		});
		var Ha = k.toFixed && ("0.000" !== 8e-5.toFixed(3) || "1" !== .9.toFixed(0) || "1.25" !== 1.255.toFixed(2) || "1000000000000000128" !== 0xde0b6b3a7640080.toFixed(0)),
		Ia = {
			base: 1e7,
			size: 6,
			data: [0, 0, 0, 0, 0, 0],
			multiply: function (a, b) {
				for (var c = -1, d = b; ++c < Ia.size; )
					d += a * Ia.data[c], Ia.data[c] = d % Ia.base, d = Math.floor(d / Ia.base)
			},
			divide: function (a) {
				for (var b = Ia.size, c = 0; --b >= 0; )
					c += Ia.data[b], Ia.data[b] = Math.floor(c / a), c = c % a * Ia.base
			},
			numToString: function () {
				for (var a = Ia.size, b = ""; --a >= 0; )
					if ("" !== b || 0 === a || 0 !== Ia.data[a]) {
						var c = h(Ia.data[a]);
						"" === b ? b = c : b += O("0000000", 0, 7 - c.length) + c
					}
				return b
			},
			pow: function Za(a, b, c) {
				return 0 === b ? c : b % 2 === 1 ? Za(a, b - 1, c * a) : Za(a * a, b / 2, c)
			},
			log: function (a) {
				for (var b = 0, c = a; c >= 4096; )
					b += 12, c /= 4096;
				for (; c >= 2; )
					b += 1, c /= 2;
				return b
			}
		},
		Ja = function (a) {
			var b,
			c,
			d,
			e,
			f,
			g,
			i,
			k;
			if (b = j(a), b = J(b) ? 0 : Math.floor(b), 0 > b || b > 20)
				throw new RangeError("Number.toFixed called with invalid number of decimals");
			if (c = j(this), J(c))
				return "NaN";
			if (-1e21 >= c || c >= 1e21)
				return h(c);
			if (d = "", 0 > c && (d = "-", c = -c), e = "0", c > 1e-21)
				if (f = Ia.log(c * Ia.pow(2, 69, 1)) - 69, g = 0 > f ? c * Ia.pow(2, -f, 1) : c / Ia.pow(2, f, 1), g *= 4503599627370496, f = 52 - f, f > 0) {
					for (Ia.multiply(0, g), i = b; i >= 7; )
						Ia.multiply(1e7, 0), i -= 7;
					for (Ia.multiply(Ia.pow(10, i, 1), 0), i = f - 1; i >= 23; )
						Ia.divide(1 << 23), i -= 23;
					Ia.divide(1 << i),
					Ia.multiply(1, 1),
					Ia.divide(2),
					e = Ia.numToString()
				} else
					Ia.multiply(0, g), Ia.multiply(1 << -f, 0), e = Ia.numToString() + O("0.00000000000000000000", 2, 2 + b);
			return b > 0 ? (k = e.length, e = b >= k ? d + O("0.0000000000000000000", 0, b - k + 2) + e : d + O(e, 0, k - b) + "." + O(e, k - b)) : e = d + e,
			e
		};
		H(k, {
			toFixed: Ja
		}, Ha);
		var Ka = function () {
			try {
				return "1" === 1..toPrecision(void 0)
			} catch (a) {
				return !0
			}
		}
		(),
		La = k.toPrecision;
		H(k, {
			toPrecision: function (a) {
				return "undefined" == typeof a ? La.call(this) : La.call(this, a)
			}
		}, Ka),
		2 !== "ab".split(/(?:ab)*/).length || 4 !== ".".split(/(.?)(.?)/).length || "t" === "tesst".split(/(s)*/)[1] || 4 !== "test".split(/(?:)/, -1).length || "".split(/.?/).length || ".".split(/()()/).length > 1 ? !function () {
			var a = "undefined" == typeof / () ?? /.exec("")[1],b=Math.pow(2,32)-1;i.split=function(c,d){var e=this;if("undefined"==typeof c&&0===d)return[];if(!z(c))return P(this,c,d);var f,g,h,i,j=[],k=(c.ignoreCase?"i":"")+(c.multiline?"m":"")+(c.unicode?"u":"")+(c.sticky?"y":""),m=0,o=new RegExp(c.source,k+"g");e+="",a||(f=new RegExp("^"+o.source+"$(?!\\s)",k));var p="undefined"==typeof d?b:K.ToUint32(d);for(g=o.exec(e);g&&(h=g.index+g[0].length,!(h>m&&(R(j,O(e,m,g.index)),!a&&g.length>1&&g[0].replace(f,function(){for(var a=1;a<arguments.length-2;a++)"undefined"==typeof arguments[a]&&(g[a]=void 0)}),g.length>1&&g.index<e.length&&n.apply(j,l.call(g,1)),i=g[0].length,m=h,j.length>=p)));)o.lastIndex===g.index&&o.lastIndex++,g=o.exec(e);return m===e.length?(i||!o.test(""))&&R(j,""):R(j,O(e,m)),j.length>p?O(j,0,p):j}}():"0".split(void 0,0).length&&(i.split=function(a,b){return"undefined"==typeof a&&0===b?[]:P(this,a,b)});var Ma=i.replace,Na=function(){var a=[];return"x".replace(/x(.) ? /g,function(b,c){R(a,c)}),1===a.length&&"undefined"==typeof a[0]}();Na||(i.replace=function(a,c){var d=b(c),e=z(a)&&/ \ )[ *  ? ] / .test(a.source);
			if (d && e) {
				var f = function (b) {
					var d = arguments.length,
					e = a.lastIndex;
					a.lastIndex = 0;
					var f = a.exec(b) || [];
					return a.lastIndex = e,
					R(f, arguments[d - 2], arguments[d - 1]),
					c.apply(this, f)
				};
				return Ma.call(this, a, f)
			}
			return Ma.call(this, a, c)
		});
		var Oa = i.substr,
		Pa = "".substr && "b" !== "0b".substr(-1);
		H(i, {
			substr : function (a, b) {
				var c = a;
				return 0 > a && (c = r(this.length + a, 0)),
				Oa.call(this, c, b)
			}
		}, Pa);
		var Qa = "	\n\x0B\f\r   ᠎             　\u2028\u2029\ufeff",
		Ra = "​",
		Sa = "[" + Qa + "]",
		Ta = new RegExp("^" + Sa + Sa + "*"),
		Ua = new RegExp(Sa + Sa + "*$"),
		Va = i.trim && (Qa.trim() || !Ra.trim());
		H(i, {
			trim : function () {
				if ("undefined" == typeof this || null === this)
					throw new TypeError("can't convert " + this + " to object");
				return h(this).replace(Ta, "").replace(Ua, "")
			}
		}, Va);
		var Wa = i.lastIndexOf && -1 !== "abcあい".lastIndexOf("あい", 2);
		H(i, {
			lastIndexOf: function (a) {
				if ("undefined" == typeof this || null === this)
					throw new TypeError("can't convert " + this + " to object");
				for (var b = h(this), c = h(a), d = arguments.length > 1 ? j(arguments[1]) : NaN, e = J(d) ? 1 / 0 : K.ToInteger(d), f = s(r(e, 0), b.length), g = c.length, i = f + g; i > 0; ) {
					i = r(0, i - g);
					var k = Q(O(b, i, f + g), c);
					if (-1 !== k)
						return i + k
				}
				return -1
			}
		}, Wa);
		var Xa = i.lastIndexOf;
		if (H(i, {
				lastIndexOf: function (a) {
					return Xa.apply(this, arguments)
				}
			}, 1 !== i.lastIndexOf.length), (8 !== parseInt(Qa + "08") || 22 !== parseInt(Qa + "0x16")) && (parseInt = function (a) {
				var b = /^[\-+]?0[xX]/;
				return function (c, d) {
					var e = h(c).trim(),
					f = j(d) || (b.test(e) ? 16 : 10);
					return a(e, f)
				}
			}
				(parseInt)), "RangeError: test" !== String(new RangeError("test"))) {
			var Ya = (Error.prototype.toString, function () {
				if ("undefined" == typeof this || null === this)
					throw new TypeError("can't convert " + this + " to object");
				var a = this.name;
				"undefined" == typeof a ? a = "Error" : "string" != typeof a && (a = h(a));
				var b = this.message;
				return "undefined" == typeof b ? b = "" : "string" != typeof b && (b = h(b)),
				a ? b ? a + ": " + b : a : b
			});
			Error.prototype.toString = Ya
		}
	}),
	function (a, b) {
		"use strict";
		"function" == typeof define && define.amd ? define(b) : "object" == typeof exports ? module.exports = b() : a.returnExports = b()
	}
	(this, function () {
		var a,
		c,
		d,
		e,
		f = Function.prototype.call,
		g = Object.prototype,
		h = f.bind(g.hasOwnProperty),
		i = f.bind(g.propertyIsEnumerable),
		j = f.bind(g.toString),
		k = h(g, "__defineGetter__");
		k && (a = f.bind(g.__defineGetter__), c = f.bind(g.__defineSetter__), d = f.bind(g.__lookupGetter__), e = f.bind(g.__lookupSetter__)),
		Object.getPrototypeOf || (Object.getPrototypeOf = function (a) {
			var b = a.__proto__;
			return b || null === b ? b : "[object Function]" === j(a.constructor) ? a.constructor.prototype : a instanceof Object ? g : null
		});
		var l = function (a) {
			try {
				return a.sentinel = 0,
				0 === Object.getOwnPropertyDescriptor(a, "sentinel").value
			} catch (b) {
				return !1
			}
		};
		if (Object.defineProperty) {
			var m = l({}),
			n = "undefined" == typeof b || l(b.createElement("div"));
			if (!n || !m)
				var o = Object.getOwnPropertyDescriptor
		}
		if (!Object.getOwnPropertyDescriptor || o) {
			var p = "Object.getOwnPropertyDescriptor called on a non-object: ";
			Object.getOwnPropertyDescriptor = function (a, b) {
				if ("object" != typeof a && "function" != typeof a || null === a)
					throw new TypeError(p + a);
				if (o)
					try {
						return o.call(Object, a, b)
					} catch (c) {}
				var f;
				if (!h(a, b))
					return f;
				if (f = {
						enumerable: i(a, b),
						configurable: !0
					}, k) {
					var j = a.__proto__,
					l = a !== g;
					l && (a.__proto__ = g);
					var m = d(a, b),
					n = e(a, b);
					if (l && (a.__proto__ = j), m || n)
						return m && (f.get = m), n && (f.set = n), f
				}
				return f.value = a[b],
				f.writable = !0,
				f
			}
		}
		if (Object.getOwnPropertyNames || (Object.getOwnPropertyNames = function (a) {
				return Object.keys(a)
			}), !Object.create) {
			var q,
			r = !({
				__proto__: null
			}
				instanceof Object),
			s = function () {
				if (!b.domain)
					return !1;
				try {
					return !!new ActiveXObject("htmlfile")
				} catch (a) {
					return !1
				}
			},
			t = function () {
				var a,
				b;
				return b = new ActiveXObject("htmlfile"),
				b.write("<script></script>"),
				b.close(),
				a = b.parentWindow.Object.prototype,
				b = null,
				a
			},
			u = function () {
				var a,
				c = b.createElement("iframe"),
				d = b.body || b.documentElement;
				return c.style.display = "none",
				d.appendChild(c),
				c.src = "javascript:",
				a = c.contentWindow.Object.prototype,
				d.removeChild(c),
				c = null,
				a
			};
			q = r || "undefined" == typeof b ? function () {
				return {
					__proto__: null
				}
			}
			 : function () {
				var a = s() ? t() : u();
				delete a.constructor,
				delete a.hasOwnProperty,
				delete a.propertyIsEnumerable,
				delete a.isPrototypeOf,
				delete a.toLocaleString,
				delete a.toString,
				delete a.valueOf;
				var b = function () {};
				return b.prototype = a,
				q = function () {
					return new b
				},
				new b
			},
			Object.create = function (a, b) {
				var c,
				d = function () {};
				if (null === a)
					c = q();
				else {
					if ("object" != typeof a && "function" != typeof a)
						throw new TypeError("Object prototype may only be an Object or null");
					d.prototype = a,
					c = new d,
					c.__proto__ = a
				}
				return void 0 !== b && Object.defineProperties(c, b),
				c
			}
		}
		var v = function (a) {
			try {
				return Object.defineProperty(a, "sentinel", {}),
				"sentinel" in a
			} catch (b) {
				return !1
			}
		};
		if (Object.defineProperty) {
			var w = v({}),
			x = "undefined" == typeof b || v(b.createElement("div"));
			if (!w || !x)
				var y = Object.defineProperty, z = Object.defineProperties
		}
		if (!Object.defineProperty || y) {
			var A = "Property description must be an object: ",
			B = "Object.defineProperty called on non-object: ",
			C = "getters & setters can not be defined on this javascript engine";
			Object.defineProperty = function (b, f, h) {
				if ("object" != typeof b && "function" != typeof b || null === b)
					throw new TypeError(B + b);
				if ("object" != typeof h && "function" != typeof h || null === h)
					throw new TypeError(A + h);
				if (y)
					try {
						return y.call(Object, b, f, h)
					} catch (i) {}
				if ("value" in h)
					if (k && (d(b, f) || e(b, f))) {
						var j = b.__proto__;
						b.__proto__ = g,
						delete b[f],
						b[f] = h.value,
						b.__proto__ = j
					} else
						b[f] = h.value;
				else {
					if (!k && ("get" in h || "set" in h))
						throw new TypeError(C);
					"get" in h && a(b, f, h.get),
					"set" in h && c(b, f, h.set)
				}
				return b
			}
		}
		(!Object.defineProperties || z) && (Object.defineProperties = function (a, b) {
			if (z)
				try {
					return z.call(Object, a, b)
				} catch (c) {}
			return Object.keys(b).forEach(function (c) {
				"__proto__" !== c && Object.defineProperty(a, c, b[c])
			}),
			a
		}),
		Object.seal || (Object.seal = function (a) {
			if (Object(a) !== a)
				throw new TypeError("Object.seal can only be called on Objects.");
			return a
		}),
		Object.freeze || (Object.freeze = function (a) {
			if (Object(a) !== a)
				throw new TypeError("Object.freeze can only be called on Objects.");
			return a
		});
		try {
			Object.freeze(function () {})
		} catch (D) {
			Object.freeze = function (a) {
				return function (b) {
					return "function" == typeof b ? b : a(b)
				}
			}
			(Object.freeze)
		}
		Object.preventExtensions || (Object.preventExtensions = function (a) {
			if (Object(a) !== a)
				throw new TypeError("Object.preventExtensions can only be called on Objects.");
			return a
		}),
		Object.isSealed || (Object.isSealed = function (a) {
			if (Object(a) !== a)
				throw new TypeError("Object.isSealed can only be called on Objects.");
			return !1
		}),
		Object.isFrozen || (Object.isFrozen = function (a) {
			if (Object(a) !== a)
				throw new TypeError("Object.isFrozen can only be called on Objects.");
			return !1
		}),
		Object.isExtensible || (Object.isExtensible = function (a) {
			if (Object(a) !== a)
				throw new TypeError("Object.isExtensible can only be called on Objects.");
			for (var b = ""; h(a, b); )
				b += "?";
			a[b] = !0;
			var c = h(a, b);
			return delete a[b],
			c
		})
	})
}
(window, document);
/**
 * @license
 * Video.js 5.10.7 <http://videojs.com/>
 * Copyright Brightcove, Inc. <https://www.brightcove.com/>
 * Available under Apache License Version 2.0
 * <https://github.com/videojs/video.js/blob/master/LICENSE>
 *
 * Includes vtt.js <https://github.com/mozilla/vtt.js>
 * Available under Apache License Version 2.0
 * <https://github.com/mozilla/vtt.js/blob/master/LICENSE>
 */
!function (a) {
	if ("object" == typeof exports && "undefined" != typeof module)
		module.exports = a();
	else if ("function" == typeof define && define.amd)
		define([], a);
	else {
		var b;
		b = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof self ? self : this,
		b.videojs = a()
	}
}
(function () {
	var a;
	return function b(a, c, d) {
		function e(g, h) {
			if (!c[g]) {
				if (!a[g]) {
					var i = "function" == typeof require && require;
					if (!h && i)
						return i(g, !0);
					if (f)
						return f(g, !0);
					var j = new Error("Cannot find module '" + g + "'");
					throw j.code = "MODULE_NOT_FOUND",
					j
				}
				var k = c[g] = {
					exports: {}
				};
				a[g][0].call(k.exports, function (b) {
					var c = a[g][1][b];
					return e(c ? c : b)
				}, k, k.exports, b, a, c, d)
			}
			return c[g].exports
		}
		for (var f = "function" == typeof require && require, g = 0; g < d.length; g++)
			e(d[g]);
		return e
	}
	({
		1 : [function (a, b) {
				(function (c) {
					var d = "undefined" != typeof c ? c : "undefined" != typeof window ? window : {},
					e = a("min-document");
					if ("undefined" != typeof document)
						b.exports = document;
					else {
						var f = d["__GLOBAL_DOCUMENT_CACHE@4"];
						f || (f = d["__GLOBAL_DOCUMENT_CACHE@4"] = e),
						b.exports = f
					}
				}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {})
			}, {
				"min-document": 3
			}
		],
		2: [function (a, b) {
				(function (a) {
					b.exports = "undefined" != typeof window ? window : "undefined" != typeof a ? a : "undefined" != typeof self ? self : {}
				}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {})
			}, {}
		],
		3: [function () {}, {}
		],
		4: [function (a, b) {
				var c = a("../internal/getNative"),
				d = c(Date, "now"),
				e = d || function () {
					return (new Date).getTime()
				};
				b.exports = e
			}, {
				"../internal/getNative": 20
			}
		],
		5: [function (a, b) {
				function c(a, b, c) {
					function h() {
						r && clearTimeout(r),
						n && clearTimeout(n),
						t = 0,
						n = r = s = void 0
					}
					function i(b, c) {
						c && clearTimeout(c),
						n = r = s = void 0,
						b && (t = e(), o = a.apply(q, m), r || n || (m = q = void 0))
					}
					function j() {
						var a = b - (e() - p);
						0 >= a || a > b ? i(s, n) : r = setTimeout(j, a)
					}
					function k() {
						i(v, r)
					}
					function l() {
						if (m = arguments, p = e(), q = this, s = v && (r || !w), u === !1)
							var c = w && !r;
						else {
							n || w || (t = p);
							var d = u - (p - t),
							f = 0 >= d || d > u;
							f ? (n && (n = clearTimeout(n)), t = p, o = a.apply(q, m)) : n || (n = setTimeout(k, d))
						}
						return f && r ? r = clearTimeout(r) : r || b === u || (r = setTimeout(j, b)),
						c && (f = !0, o = a.apply(q, m)),
						!f || r || n || (m = q = void 0),
						o
					}
					var m,
					n,
					o,
					p,
					q,
					r,
					s,
					t = 0,
					u = !1,
					v = !0;
					if ("function" != typeof a)
						throw new TypeError(f);
					if (b = 0 > b ? 0 : +b || 0, c === !0) {
						var w = !0;
						v = !1
					} else
						d(c) && (w = !!c.leading, u = "maxWait" in c && g(+c.maxWait || 0, b), v = "trailing" in c ? !!c.trailing : v);
					return l.cancel = h,
					l
				}
				var d = a("../lang/isObject"),
				e = a("../date/now"),
				f = "Expected a function",
				g = Math.max;
				b.exports = c
			}, {
				"../date/now": 4,
				"../lang/isObject": 33
			}
		],
		6: [function (a, b) {
				function c(a, b) {
					if ("function" != typeof a)
						throw new TypeError(d);
					return b = e(void 0 === b ? a.length - 1 : +b || 0, 0),
					function () {
						for (var c = arguments, d = -1, f = e(c.length - b, 0), g = Array(f); ++d < f; )
							g[d] = c[b + d];
						switch (b) {
						case 0:
							return a.call(this, g);
						case 1:
							return a.call(this, c[0], g);
						case 2:
							return a.call(this, c[0], c[1], g)
						}
						var h = Array(b + 1);
						for (d = -1; ++d < b; )
							h[d] = c[d];
						return h[b] = g,
						a.apply(this, h)
					}
				}
				var d = "Expected a function",
				e = Math.max;
				b.exports = c
			}, {}
		],
		7: [function (a, b) {
				function c(a, b, c) {
					var g = !0,
					h = !0;
					if ("function" != typeof a)
						throw new TypeError(f);
					return c === !1 ? g = !1 : e(c) && (g = "leading" in c ? !!c.leading : g, h = "trailing" in c ? !!c.trailing : h),
					d(a, b, {
						leading: g,
						maxWait: +b,
						trailing: h
					})
				}
				var d = a("./debounce"),
				e = a("../lang/isObject"),
				f = "Expected a function";
				b.exports = c
			}, {
				"../lang/isObject": 33,
				"./debounce": 5
			}
		],
		8: [function (a, b) {
				function c(a, b) {
					var c = -1,
					d = a.length;
					for (b || (b = Array(d)); ++c < d; )
						b[c] = a[c];
					return b
				}
				b.exports = c
			}, {}
		],
		9: [function (a, b) {
				function c(a, b) {
					for (var c = -1, d = a.length; ++c < d && b(a[c], c, a) !== !1; );
					return a
				}
				b.exports = c
			}, {}
		],
		10: [function (a, b) {
				function c(a, b, c) {
					c || (c = {});
					for (var d = -1, e = b.length; ++d < e; ) {
						var f = b[d];
						c[f] = a[f]
					}
					return c
				}
				b.exports = c
			}, {}
		],
		11: [function (a, b) {
				var c = a("./createBaseFor"),
				d = c();
				b.exports = d
			}, {
				"./createBaseFor": 18
			}
		],
		12: [function (a, b) {
				function c(a, b) {
					return d(a, b, e)
				}
				var d = a("./baseFor"),
				e = a("../object/keysIn");
				b.exports = c
			}, {
				"../object/keysIn": 39,
				"./baseFor": 11
			}
		],
		13: [function (a, b) {
				function c(a, b, l, m, n) {
					if (!h(a))
						return a;
					var o = g(b) && (f(b) || j(b)),
					p = o ? void 0 : k(b);
					return d(p || b, function (d, f) {
						if (p && (f = d, d = b[f]), i(d))
							m || (m = []), n || (n = []), e(a, b, f, c, l, m, n);
						else {
							var g = a[f],
							h = l ? l(g, d, f, a, b) : void 0,
							j = void 0 === h;
							j && (h = d),
							void 0 === h && (!o || f in a) || !j && (h === h ? h === g : g !== g) || (a[f] = h)
						}
					}),
					a
				}
				var d = a("./arrayEach"),
				e = a("./baseMergeDeep"),
				f = a("../lang/isArray"),
				g = a("./isArrayLike"),
				h = a("../lang/isObject"),
				i = a("./isObjectLike"),
				j = a("../lang/isTypedArray"),
				k = a("../object/keys");
				b.exports = c
			}, {
				"../lang/isArray": 30,
				"../lang/isObject": 33,
				"../lang/isTypedArray": 36,
				"../object/keys": 38,
				"./arrayEach": 9,
				"./baseMergeDeep": 14,
				"./isArrayLike": 21,
				"./isObjectLike": 26
			}
		],
		14: [function (a, b) {
				function c(a, b, c, k, l, m, n) {
					for (var o = m.length, p = b[c]; o--; )
						if (m[o] == p)
							return void(a[c] = n[o]);
					var q = a[c],
					r = l ? l(q, p, c, a, b) : void 0,
					s = void 0 === r;
					s && (r = p, g(p) && (f(p) || i(p)) ? r = f(q) ? q : g(q) ? d(q) : [] : h(p) || e(p) ? r = e(q) ? j(q) : h(q) ? q : {}
						 : s = !1),
					m.push(p),
					n.push(r),
					s ? a[c] = k(r, p, l, m, n) : (r === r ? r !== q : q === q) && (a[c] = r)
				}
				var d = a("./arrayCopy"),
				e = a("../lang/isArguments"),
				f = a("../lang/isArray"),
				g = a("./isArrayLike"),
				h = a("../lang/isPlainObject"),
				i = a("../lang/isTypedArray"),
				j = a("../lang/toPlainObject");
				b.exports = c
			}, {
				"../lang/isArguments": 29,
				"../lang/isArray": 30,
				"../lang/isPlainObject": 34,
				"../lang/isTypedArray": 36,
				"../lang/toPlainObject": 37,
				"./arrayCopy": 8,
				"./isArrayLike": 21
			}
		],
		15: [function (a, b) {
				function c(a) {
					return function (b) {
						return null == b ? void 0 : d(b)[a]
					}
				}
				var d = a("./toObject");
				b.exports = c
			}, {
				"./toObject": 28
			}
		],
		16: [function (a, b) {
				function c(a, b, c) {
					if ("function" != typeof a)
						return d;
					if (void 0 === b)
						return a;
					switch (c) {
					case 1:
						return function (c) {
							return a.call(b, c)
						};
					case 3:
						return function (c, d, e) {
							return a.call(b, c, d, e)
						};
					case 4:
						return function (c, d, e, f) {
							return a.call(b, c, d, e, f)
						};
					case 5:
						return function (c, d, e, f, g) {
							return a.call(b, c, d, e, f, g)
						}
					}
					return function () {
						return a.apply(b, arguments)
					}
				}
				var d = a("../utility/identity");
				b.exports = c
			}, {
				"../utility/identity": 42
			}
		],
		17: [function (a, b) {
				function c(a) {
					return f(function (b, c) {
						var f = -1,
						g = null == b ? 0 : c.length,
						h = g > 2 ? c[g - 2] : void 0,
						i = g > 2 ? c[2] : void 0,
						j = g > 1 ? c[g - 1] : void 0;
						for ("function" == typeof h ? (h = d(h, j, 5), g -= 2) : (h = "function" == typeof j ? j : void 0, g -= h ? 1 : 0), i && e(c[0], c[1], i) && (h = 3 > g ? void 0 : h, g = 1); ++f < g; ) {
							var k = c[f];
							k && a(b, k, h)
						}
						return b
					})
				}
				var d = a("./bindCallback"),
				e = a("./isIterateeCall"),
				f = a("../function/restParam");
				b.exports = c
			}, {
				"../function/restParam": 6,
				"./bindCallback": 16,
				"./isIterateeCall": 24
			}
		],
		18: [function (a, b) {
				function c(a) {
					return function (b, c, e) {
						for (var f = d(b), g = e(b), h = g.length, i = a ? h : -1; a ? i-- : ++i < h; ) {
							var j = g[i];
							if (c(f[j], j, f) === !1)
								break
						}
						return b
					}
				}
				var d = a("./toObject");
				b.exports = c
			}, {
				"./toObject": 28
			}
		],
		19: [function (a, b) {
				var c = a("./baseProperty"),
				d = c("length");
				b.exports = d
			}, {
				"./baseProperty": 15
			}
		],
		20: [function (a, b) {
				function c(a, b) {
					var c = null == a ? void 0 : a[b];
					return d(c) ? c : void 0
				}
				var d = a("../lang/isNative");
				b.exports = c
			}, {
				"../lang/isNative": 32
			}
		],
		21: [function (a, b) {
				function c(a) {
					return null != a && e(d(a))
				}
				var d = a("./getLength"),
				e = a("./isLength");
				b.exports = c
			}, {
				"./getLength": 19,
				"./isLength": 25
			}
		],
		22: [function (a, b) {
				var c = function () {
					try {
						Object({
							toString: 0
						}
							 + "")
					} catch (a) {
						return function () {
							return !1
						}
					}
					return function (a) {
						return "function" != typeof a.toString && "string" == typeof(a + "")
					}
				}
				();
				b.exports = c
			}, {}
		],
		23: [function (a, b) {
				function c(a, b) {
					return a = "number" == typeof a || d.test(a) ? +a : -1,
					b = null == b ? e : b,
					a > -1 && a % 1 == 0 && b > a
				}
				var d = /^\d+$/,
				e = 9007199254740991;
				b.exports = c
			}, {}
		],
		24: [function (a, b) {
				function c(a, b, c) {
					if (!f(c))
						return !1;
					var g = typeof b;
					if ("number" == g ? d(c) && e(b, c.length) : "string" == g && b in c) {
						var h = c[b];
						return a === a ? a === h : h !== h
					}
					return !1
				}
				var d = a("./isArrayLike"),
				e = a("./isIndex"),
				f = a("../lang/isObject");
				b.exports = c
			}, {
				"../lang/isObject": 33,
				"./isArrayLike": 21,
				"./isIndex": 23
			}
		],
		25: [function (a, b) {
				function c(a) {
					return "number" == typeof a && a > -1 && a % 1 == 0 && d >= a
				}
				var d = 9007199254740991;
				b.exports = c
			}, {}
		],
		26: [function (a, b) {
				function c(a) {
					return !!a && "object" == typeof a
				}
				b.exports = c
			}, {}
		],
		27: [function (a, b) {
				function c(a) {
					for (var b = i(a), c = b.length, j = c && a.length, l = !!j && g(j) && (e(a) || d(a) || h(a)), m = -1, n = []; ++m < c; ) {
						var o = b[m];
						(l && f(o, j) || k.call(a, o)) && n.push(o)
					}
					return n
				}
				var d = a("../lang/isArguments"),
				e = a("../lang/isArray"),
				f = a("./isIndex"),
				g = a("./isLength"),
				h = a("../lang/isString"),
				i = a("../object/keysIn"),
				j = Object.prototype,
				k = j.hasOwnProperty;
				b.exports = c
			}, {
				"../lang/isArguments": 29,
				"../lang/isArray": 30,
				"../lang/isString": 35,
				"../object/keysIn": 39,
				"./isIndex": 23,
				"./isLength": 25
			}
		],
		28: [function (a, b) {
				function c(a) {
					if (f.unindexedChars && e(a)) {
						for (var b = -1, c = a.length, g = Object(a); ++b < c; )
							g[b] = a.charAt(b);
						return g
					}
					return d(a) ? a : Object(a)
				}
				var d = a("../lang/isObject"),
				e = a("../lang/isString"),
				f = a("../support");
				b.exports = c
			}, {
				"../lang/isObject": 33,
				"../lang/isString": 35,
				"../support": 41
			}
		],
		29: [function (a, b) {
				function c(a) {
					return e(a) && d(a) && g.call(a, "callee") && !h.call(a, "callee")
				}
				var d = a("../internal/isArrayLike"),
				e = a("../internal/isObjectLike"),
				f = Object.prototype,
				g = f.hasOwnProperty,
				h = f.propertyIsEnumerable;
				b.exports = c
			}, {
				"../internal/isArrayLike": 21,
				"../internal/isObjectLike": 26
			}
		],
		30: [function (a, b) {
				var c = a("../internal/getNative"),
				d = a("../internal/isLength"),
				e = a("../internal/isObjectLike"),
				f = "[object Array]",
				g = Object.prototype,
				h = g.toString,
				i = c(Array, "isArray"),
				j = i || function (a) {
					return e(a) && d(a.length) && h.call(a) == f
				};
				b.exports = j
			}, {
				"../internal/getNative": 20,
				"../internal/isLength": 25,
				"../internal/isObjectLike": 26
			}
		],
		31: [function (a, b) {
				function c(a) {
					return d(a) && g.call(a) == e
				}
				var d = a("./isObject"),
				e = "[object Function]",
				f = Object.prototype,
				g = f.toString;
				b.exports = c
			}, {
				"./isObject": 33
			}
		],
		32: [function (a, b) {
				function c(a) {
					return null == a ? !1 : d(a) ? k.test(i.call(a)) : f(a) && (e(a) ? k : g).test(a)
				}
				var d = a("./isFunction"),
				e = a("../internal/isHostObject"),
				f = a("../internal/isObjectLike"),
				g = /^\[object .+?Constructor\]$/,
				h = Object.prototype,
				i = Function.prototype.toString,
				j = h.hasOwnProperty,
				k = RegExp("^" + i.call(j).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");
				b.exports = c
			}, {
				"../internal/isHostObject": 22,
				"../internal/isObjectLike": 26,
				"./isFunction": 31
			}
		],
		33: [function (a, b) {
				function c(a) {
					var b = typeof a;
					return !!a && ("object" == b || "function" == b)
				}
				b.exports = c
			}, {}
		],
		34: [function (a, b) {
				function c(a) {
					var b;
					if (!g(a) || l.call(a) != i || f(a) || e(a) || !k.call(a, "constructor") && (b = a.constructor, "function" == typeof b && !(b instanceof b)))
						return !1;
					var c;
					return h.ownLast ? (d(a, function (a, b, d) {
							return c = k.call(d, b),
							!1
						}), c !== !1) : (d(a, function (a, b) {
							c = b
						}), void 0 === c || k.call(a, c))
				}
				var d = a("../internal/baseForIn"),
				e = a("./isArguments"),
				f = a("../internal/isHostObject"),
				g = a("../internal/isObjectLike"),
				h = a("../support"),
				i = "[object Object]",
				j = Object.prototype,
				k = j.hasOwnProperty,
				l = j.toString;
				b.exports = c
			}, {
				"../internal/baseForIn": 12,
				"../internal/isHostObject": 22,
				"../internal/isObjectLike": 26,
				"../support": 41,
				"./isArguments": 29
			}
		],
		35: [function (a, b) {
				function c(a) {
					return "string" == typeof a || d(a) && g.call(a) == e
				}
				var d = a("../internal/isObjectLike"),
				e = "[object String]",
				f = Object.prototype,
				g = f.toString;
				b.exports = c
			}, {
				"../internal/isObjectLike": 26
			}
		],
		36: [function (a, b) {
				function c(a) {
					return e(a) && d(a.length) && !!C[E.call(a)]
				}
				var d = a("../internal/isLength"),
				e = a("../internal/isObjectLike"),
				f = "[object Arguments]",
				g = "[object Array]",
				h = "[object Boolean]",
				i = "[object Date]",
				j = "[object Error]",
				k = "[object Function]",
				l = "[object Map]",
				m = "[object Number]",
				n = "[object Object]",
				o = "[object RegExp]",
				p = "[object Set]",
				q = "[object String]",
				r = "[object WeakMap]",
				s = "[object ArrayBuffer]",
				t = "[object Float32Array]",
				u = "[object Float64Array]",
				v = "[object Int8Array]",
				w = "[object Int16Array]",
				x = "[object Int32Array]",
				y = "[object Uint8Array]",
				z = "[object Uint8ClampedArray]",
				A = "[object Uint16Array]",
				B = "[object Uint32Array]",
				C = {};
				C[t] = C[u] = C[v] = C[w] = C[x] = C[y] = C[z] = C[A] = C[B] = !0,
				C[f] = C[g] = C[s] = C[h] = C[i] = C[j] = C[k] = C[l] = C[m] = C[n] = C[o] = C[p] = C[q] = C[r] = !1;
				var D = Object.prototype,
				E = D.toString;
				b.exports = c
			}, {
				"../internal/isLength": 25,
				"../internal/isObjectLike": 26
			}
		],
		37: [function (a, b) {
				function c(a) {
					return d(a, e(a))
				}
				var d = a("../internal/baseCopy"),
				e = a("../object/keysIn");
				b.exports = c
			}, {
				"../internal/baseCopy": 10,
				"../object/keysIn": 39
			}
		],
		38: [function (a, b) {
				var c = a("../internal/getNative"),
				d = a("../internal/isArrayLike"),
				e = a("../lang/isObject"),
				f = a("../internal/shimKeys"),
				g = a("../support"),
				h = c(Object, "keys"),
				i = h ? function (a) {
					var b = null == a ? void 0 : a.constructor;
					return "function" == typeof b && b.prototype === a || ("function" == typeof a ? g.enumPrototypes : d(a)) ? f(a) : e(a) ? h(a) : []
				}
				 : f;
				b.exports = i
			}, {
				"../internal/getNative": 20,
				"../internal/isArrayLike": 21,
				"../internal/shimKeys": 27,
				"../lang/isObject": 33,
				"../support": 41
			}
		],
		39: [function (a, b) {
				function c(a) {
					if (null == a)
						return [];
					j(a) || (a = Object(a));
					var b = a.length;
					b = b && i(b) && (f(a) || e(a) || k(a)) && b || 0;
					for (var c = a.constructor, d = -1, m = g(c) && c.prototype || x, n = m === a, o = Array(b), q = b > 0, r = l.enumErrorProps && (a === w || a instanceof Error), t = l.enumPrototypes && g(a); ++d < b; )
						o[d] = d + "";
					for (var C in a)
						t && "prototype" == C || r && ("message" == C || "name" == C) || q && h(C, b) || "constructor" == C && (n || !z.call(a, C)) || o.push(C);
					if (l.nonEnumShadows && a !== x) {
						var D = a === y ? u : a === w ? p : A.call(a),
						E = B[D] || B[s];
						for (D == s && (m = x), b = v.length; b--; ) {
							C = v[b];
							var F = E[C];
							n && F || (F ? !z.call(a, C) : a[C] === m[C]) || o.push(C)
						}
					}
					return o
				}
				var d = a("../internal/arrayEach"),
				e = a("../lang/isArguments"),
				f = a("../lang/isArray"),
				g = a("../lang/isFunction"),
				h = a("../internal/isIndex"),
				i = a("../internal/isLength"),
				j = a("../lang/isObject"),
				k = a("../lang/isString"),
				l = a("../support"),
				m = "[object Array]",
				n = "[object Boolean]",
				o = "[object Date]",
				p = "[object Error]",
				q = "[object Function]",
				r = "[object Number]",
				s = "[object Object]",
				t = "[object RegExp]",
				u = "[object String]",
				v = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"],
				w = Error.prototype,
				x = Object.prototype,
				y = String.prototype,
				z = x.hasOwnProperty,
				A = x.toString,
				B = {};
				B[m] = B[o] = B[r] = {
					constructor: !0,
					toLocaleString: !0,
					toString: !0,
					valueOf: !0
				},
				B[n] = B[u] = {
					constructor: !0,
					toString: !0,
					valueOf: !0
				},
				B[p] = B[q] = B[t] = {
					constructor: !0,
					toString: !0
				},
				B[s] = {
					constructor: !0
				},
				d(v, function (a) {
					for (var b in B)
						if (z.call(B, b)) {
							var c = B[b];
							c[a] = z.call(c, a)
						}
				}),
				b.exports = c
			}, {
				"../internal/arrayEach": 9,
				"../internal/isIndex": 23,
				"../internal/isLength": 25,
				"../lang/isArguments": 29,
				"../lang/isArray": 30,
				"../lang/isFunction": 31,
				"../lang/isObject": 33,
				"../lang/isString": 35,
				"../support": 41
			}
		],
		40: [function (a, b) {
				var c = a("../internal/baseMerge"),
				d = a("../internal/createAssigner"),
				e = d(c);
				b.exports = e
			}, {
				"../internal/baseMerge": 13,
				"../internal/createAssigner": 17
			}
		],
		41: [function (a, b) {
				var c = Array.prototype,
				d = Error.prototype,
				e = Object.prototype,
				f = e.propertyIsEnumerable,
				g = c.splice,
				h = {};
				!function (a) {
					var b = function () {
						this.x = a
					},
					c = {
						0: a,
						length: a
					},
					e = [];
					b.prototype = {
						valueOf: a,
						y: a
					};
					for (var i in new b)
						e.push(i);
					h.enumErrorProps = f.call(d, "message") || f.call(d, "name"),
					h.enumPrototypes = f.call(b, "prototype"),
					h.nonEnumShadows = !/valueOf/.test(e),
					h.ownLast = "x" != e[0],
					h.spliceObjects = (g.call(c, 0, 1), !c[0]),
					h.unindexedChars = "x"[0] + Object("x")[0] != "xx"
				}
				(1, 0),
				b.exports = h
			}, {}
		],
		42: [function (a, b) {
				function c(a) {
					return a
				}
				b.exports = c
			}, {}
		],
		43: [function (a, b) {
				"use strict";
				var c = a("object-keys");
				b.exports = function () {
					if ("function" != typeof Symbol || "function" != typeof Object.getOwnPropertySymbols)
						return !1;
					if ("symbol" == typeof Symbol.iterator)
						return !0;
					var a = {},
					b = Symbol("test");
					if ("string" == typeof b)
						return !1;
					var d = 42;
					a[b] = d;
					for (b in a)
						return !1;
					if (0 !== c(a).length)
						return !1;
					if ("function" == typeof Object.keys && 0 !== Object.keys(a).length)
						return !1;
					if ("function" == typeof Object.getOwnPropertyNames && 0 !== Object.getOwnPropertyNames(a).length)
						return !1;
					var e = Object.getOwnPropertySymbols(a);
					if (1 !== e.length || e[0] !== b)
						return !1;
					if (!Object.prototype.propertyIsEnumerable.call(a, b))
						return !1;
					if ("function" == typeof Object.getOwnPropertyDescriptor) {
						var f = Object.getOwnPropertyDescriptor(a, b);
						if (f.value !== d || f.enumerable !== !0)
							return !1
					}
					return !0
				}
			}, {
				"object-keys": 50
			}
		],
		44: [function (a, b) {
				"use strict";
				var c = a("object-keys"),
				d = a("function-bind"),
				e = function (a) {
					return "undefined" != typeof a && null !== a
				},
				f = a("./hasSymbols")(),
				g = Object,
				h = d.call(Function.call, Array.prototype.push),
				i = d.call(Function.call, Object.prototype.propertyIsEnumerable);
				b.exports = function (a) {
					if (!e(a))
						throw new TypeError("target must be an object");
					var b,
					d,
					j,
					k,
					l,
					m,
					n,
					o = g(a);
					for (b = 1; b < arguments.length; ++b) {
						if (d = g(arguments[b]), k = c(d), f && Object.getOwnPropertySymbols)
							for (l = Object.getOwnPropertySymbols(d), j = 0; j < l.length; ++j)
								n = l[j], i(d, n) && h(k, n);
						for (j = 0; j < k.length; ++j)
							n = k[j], m = d[n], i(d, n) && (o[n] = m)
					}
					return o
				}
			}, {
				"./hasSymbols": 43,
				"function-bind": 49,
				"object-keys": 50
			}
		],
		45: [function (a, b) {
				"use strict";
				var c = a("define-properties"),
				d = a("./implementation"),
				e = a("./polyfill"),
				f = a("./shim");
				c(d, {
					implementation: d,
					getPolyfill: e,
					shim: f
				}),
				b.exports = d
			}, {
				"./implementation": 44,
				"./polyfill": 52,
				"./shim": 53,
				"define-properties": 46
			}
		],
		46: [function (a, b) {
				"use strict";
				var c = a("object-keys"),
				d = a("foreach"),
				e = "function" == typeof Symbol && "symbol" == typeof Symbol(),
				f = Object.prototype.toString,
				g = function (a) {
					return "function" == typeof a && "[object Function]" === f.call(a)
				},
				h = function () {
					var a = {};
					try {
						Object.defineProperty(a, "x", {
							enumerable: !1,
							value: a
						});
						for (var b in a)
							return !1;
						return a.x === a
					} catch (c) {
						return !1
					}
				},
				i = Object.defineProperty && h(),
				j = function (a, b, c, d) {
					(!(b in a) || g(d) && d()) && (i ? Object.defineProperty(a, b, {
							configurable: !0,
							enumerable: !1,
							value: c,
							writable: !0
						}) : a[b] = c)
				},
				k = function (a, b) {
					var f = arguments.length > 2 ? arguments[2] : {},
					g = c(b);
					e && (g = g.concat(Object.getOwnPropertySymbols(b))),
					d(g, function (c) {
						j(a, c, b[c], f[c])
					})
				};
				k.supportsDescriptors = !!i,
				b.exports = k
			}, {
				foreach: 47,
				"object-keys": 50
			}
		],
		47: [function (a, b) {
				var c = Object.prototype.hasOwnProperty,
				d = Object.prototype.toString;
				b.exports = function (a, b, e) {
					if ("[object Function]" !== d.call(b))
						throw new TypeError("iterator must be a function");
					var f = a.length;
					if (f === +f)
						for (var g = 0; f > g; g++)
							b.call(e, a[g], g, a);
					else
						for (var h in a)
							c.call(a, h) && b.call(e, a[h], h, a)
				}
			}, {}
		],
		48: [function (a, b) {
				var c = "Function.prototype.bind called on incompatible ",
				d = Array.prototype.slice,
				e = Object.prototype.toString,
				f = "[object Function]";
				b.exports = function (a) {
					var b = this;
					if ("function" != typeof b || e.call(b) !== f)
						throw new TypeError(c + b);
					for (var g, h = d.call(arguments, 1), i = function () {
						if (this instanceof g) {
							var c = b.apply(this, h.concat(d.call(arguments)));
							return Object(c) === c ? c : this
						}
						return b.apply(a, h.concat(d.call(arguments)))
					}, j = Math.max(0, b.length - h.length), k = [], l = 0; j > l; l++)
						k.push("$" + l);
					if (g = Function("binder", "return function (" + k.join(",") + "){ return binder.apply(this,arguments); }")(i), b.prototype) {
						var m = function () {};
						m.prototype = b.prototype,
						g.prototype = new m,
						m.prototype = null
					}
					return g
				}
			}, {}
		],
		49: [function (a, b) {
				var c = a("./implementation");
				b.exports = Function.prototype.bind || c
			}, {
				"./implementation": 48
			}
		],
		50: [function (a, b) {
				"use strict";
				var c = Object.prototype.hasOwnProperty,
				d = Object.prototype.toString,
				e = Array.prototype.slice,
				f = a("./isArguments"),
				g = !{
					toString: null
				}
				.propertyIsEnumerable("toString"),
				h = function () {}
				.propertyIsEnumerable("prototype"),
				i = ["toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "constructor"],
				j = function (a) {
					var b = a.constructor;
					return b && b.prototype === a
				},
				k = {
					$console: !0,
					$frame: !0,
					$frameElement: !0,
					$frames: !0,
					$parent: !0,
					$self: !0,
					$webkitIndexedDB: !0,
					$webkitStorageInfo: !0,
					$window: !0
				},
				l = function () {
					if ("undefined" == typeof window)
						return !1;
					for (var a in window)
						try {
							if (!k["$" + a] && c.call(window, a) && null !== window[a] && "object" == typeof window[a])
								try {
									j(window[a])
								} catch (b) {
									return !0
								}
						} catch (b) {
							return !0
						}
					return !1
				}
				(),
				m = function (a) {
					if ("undefined" == typeof window || !l)
						return j(a);
					try {
						return j(a)
					} catch (b) {
						return !1
					}
				},
				n = function (a) {
					var b = null !== a && "object" == typeof a,
					e = "[object Function]" === d.call(a),
					j = f(a),
					k = b && "[object String]" === d.call(a),
					l = [];
					if (!b && !e && !j)
						throw new TypeError("Object.keys called on a non-object");
					var n = h && e;
					if (k && a.length > 0 && !c.call(a, 0))
						for (var o = 0; o < a.length; ++o)
							l.push(String(o));
					if (j && a.length > 0)
						for (var p = 0; p < a.length; ++p)
							l.push(String(p));
					else
						for (var q in a)
							n && "prototype" === q || !c.call(a, q) || l.push(String(q));
					if (g)
						for (var r = m(a), s = 0; s < i.length; ++s)
							r && "constructor" === i[s] || !c.call(a, i[s]) || l.push(i[s]);
					return l
				};
				n.shim = function () {
					if (Object.keys) {
						var a = function () {
							return 2 === (Object.keys(arguments) || "").length
						}
						(1, 2);
						if (!a) {
							var b = Object.keys;
							Object.keys = function (a) {
								return b(f(a) ? e.call(a) : a)
							}
						}
					} else
						Object.keys = n;
					return Object.keys || n
				},
				b.exports = n
			}, {
				"./isArguments": 51
			}
		],
		51: [function (a, b) {
				"use strict";
				var c = Object.prototype.toString;
				b.exports = function (a) {
					var b = c.call(a),
					d = "[object Arguments]" === b;
					return d || (d = "[object Array]" !== b && null !== a && "object" == typeof a && "number" == typeof a.length && a.length >= 0 && "[object Function]" === c.call(a.callee)),
					d
				}
			}, {}
		],
		52: [function (a, b) {
				"use strict";
				var c = a("./implementation"),
				d = function () {
					if (!Object.assign)
						return !1;
					for (var a = "abcdefghijklmnopqrst", b = a.split(""), c = {}, d = 0; d < b.length; ++d)
						c[b[d]] = b[d];
					var e = Object.assign({}, c),
					f = "";
					for (var g in e)
						f += g;
					return a !== f
				},
				e = function () {
					if (!Object.assign || !Object.preventExtensions)
						return !1;
					var a = Object.preventExtensions({
							1: 2
						});
					try {
						Object.assign(a, "xy")
					} catch (b) {
						return "y" === a[1]
					}
				};
				b.exports = function () {
					return Object.assign ? d() ? c : e() ? c : Object.assign : c
				}
			}, {
				"./implementation": 44
			}
		],
		53: [function (a, b) {
				"use strict";
				var c = a("define-properties"),
				d = a("./polyfill");
				b.exports = function () {
					var a = d();
					return c(Object, {
						assign: a
					}, {
						assign: function () {
							return Object.assign !== a
						}
					}),
					a
				}
			}, {
				"./polyfill": 52,
				"define-properties": 46
			}
		],
		54: [function (a, b) {
				function c(a, b) {
					var c,
					d = null;
					try {
						c = JSON.parse(a, b)
					} catch (e) {
						d = e
					}
					return [d, c]
				}
				b.exports = c
			}, {}
		],
		55: [function (a, b) {
				function c(a) {
					return a.replace(/\n\r?\s*/g, "")
				}
				b.exports = function (a) {
					for (var b = "", d = 0; d < arguments.length; d++)
						b += c(a[d]) + (arguments[d + 1] || "");
					return b
				}
			}, {}
		],
		56: [function (a, b) {
				"use strict";
				function c(a, b) {
					for (var c = 0; c < a.length; c++)
						b(a[c])
				}
				function d(a) {
					for (var b in a)
						if (a.hasOwnProperty(b))
							return !1;
					return !0
				}
				function e(a, b, c) {
					var d = a;
					return k(b) ? (c = b, "string" == typeof a && (d = {
								uri: a
							})) : d = m(b, {
							uri: a
						}),
					d.callback = c,
					d
				}
				function f(a, b, c) {
					return b = e(a, b, c),
					g(b)
				}
				function g(a) {
					function b() {
						4 === k.readyState && g()
					}
					function c() {
						var a = void 0;
						if (k.response ? a = k.response : "text" !== k.responseType && k.responseType || (a = k.responseText || k.responseXML), u)
							try {
								a = JSON.parse(a)
							} catch (b) {}
						return a
					}
					function e(a) {
						clearTimeout(o),
						a instanceof Error || (a = new Error("" + (a || "Unknown XMLHttpRequest Error"))),
						a.statusCode = 0,
						h(a, i)
					}
					function g() {
						if (!n) {
							var b;
							clearTimeout(o),
							b = a.useXDR && void 0 === k.status ? 200 : 1223 === k.status ? 204 : k.status;
							var d = i,
							e = null;
							0 !== b ? (d = {
									body: c(),
									statusCode: b,
									method: q,
									headers: {},
									url: p,
									rawRequest: k
								}, k.getAllResponseHeaders && (d.headers = l(k.getAllResponseHeaders()))) : e = new Error("Internal XMLHttpRequest Error"),
							h(e, d, d.body)
						}
					}
					var h = a.callback;
					if ("undefined" == typeof h)
						throw new Error("callback argument missing");
					h = j(h);
					var i = {
						body: void 0,
						headers: {},
						statusCode: 0,
						method: q,
						url: p,
						rawRequest: k
					},
					k = a.xhr || null;
					k || (k = a.cors || a.useXDR ? new f.XDomainRequest : new f.XMLHttpRequest);
					var m,
					n,
					o,
					p = k.url = a.uri || a.url,
					q = k.method = a.method || "GET",
					r = a.body || a.data || null,
					s = k.headers = a.headers || {},
					t = !!a.sync,
					u = !1;
					if ("json" in a && (u = !0, s.accept || s.Accept || (s.Accept = "application/json"), "GET" !== q && "HEAD" !== q && (s["content-type"] || s["Content-Type"] || (s["Content-Type"] = "application/json"), r = JSON.stringify(a.json))), k.onreadystatechange = b, k.onload = g, k.onerror = e, k.onprogress = function () {}, k.ontimeout = e, k.open(q, p, !t, a.username, a.password), t || (k.withCredentials = !!a.withCredentials), !t && a.timeout > 0 && (o = setTimeout(function () {
									n = !0,
									k.abort("timeout");
									var a = new Error("XMLHttpRequest timeout");
									a.code = "ETIMEDOUT",
									e(a)
								}, a.timeout)), k.setRequestHeader)
						for (m in s)
							s.hasOwnProperty(m) && k.setRequestHeader(m, s[m]);
					else if (a.headers && !d(a.headers))
						throw new Error("Headers cannot be set on an XDomainRequest object");
					return "responseType" in a && (k.responseType = a.responseType),
					"beforeSend" in a && "function" == typeof a.beforeSend && a.beforeSend(k),
					k.send(r),
					k
				}
				function h() {}
				var i = a("global/window"),
				j = a("once"),
				k = a("is-function"),
				l = a("parse-headers"),
				m = a("xtend");
				b.exports = f,
				f.XMLHttpRequest = i.XMLHttpRequest || h,
				f.XDomainRequest = "withCredentials" in new f.XMLHttpRequest ? f.XMLHttpRequest : i.XDomainRequest,
				c(["get", "put", "post", "patch", "head", "delete"], function (a) {
					f["delete" === a ? "del" : a] = function (b, c, d) {
						return c = e(b, c, d),
						c.method = a.toUpperCase(),
						g(c)
					}
				})
			}, {
				"global/window": 2,
				"is-function": 57,
				once: 58,
				"parse-headers": 61,
				xtend: 62
			}
		],
		57: [function (a, b) {
				function c(a) {
					var b = d.call(a);
					return "[object Function]" === b || "function" == typeof a && "[object RegExp]" !== b || "undefined" != typeof window && (a === window.setTimeout || a === window.alert || a === window.confirm || a === window.prompt)
				}
				b.exports = c;
				var d = Object.prototype.toString
			}, {}
		],
		58: [function (a, b) {
				function c(a) {
					var b = !1;
					return function () {
						return b ? void 0 : (b = !0, a.apply(this, arguments))
					}
				}
				b.exports = c,
				c.proto = c(function () {
						Object.defineProperty(Function.prototype, "once", {
							value: function () {
								return c(this)
							},
							configurable: !0
						})
					})
			}, {}
		],
		59: [function (a, b) {
				function c(a, b, c) {
					if (!g(b))
						throw new TypeError("iterator must be a function");
					arguments.length < 3 && (c = this),
					"[object Array]" === h.call(a) ? d(a, b, c) : "string" == typeof a ? e(a, b, c) : f(a, b, c)
				}
				function d(a, b, c) {
					for (var d = 0, e = a.length; e > d; d++)
						i.call(a, d) && b.call(c, a[d], d, a)
				}
				function e(a, b, c) {
					for (var d = 0, e = a.length; e > d; d++)
						b.call(c, a.charAt(d), d, a)
				}
				function f(a, b, c) {
					for (var d in a)
						i.call(a, d) && b.call(c, a[d], d, a)
				}
				var g = a("is-function");
				b.exports = c;
				var h = Object.prototype.toString,
				i = Object.prototype.hasOwnProperty
			}, {
				"is-function": 57
			}
		],
		60: [function (a, b, c) {
				function d(a) {
					return a.replace(/^\s*|\s*$/g, "")
				}
				c = b.exports = d,
				c.left = function (a) {
					return a.replace(/^\s*/, "")
				},
				c.right = function (a) {
					return a.replace(/\s*$/, "")
				}
			}, {}
		],
		61: [function (a, b) {
				var c = a("trim"),
				d = a("for-each"),
				e = function (a) {
					return "[object Array]" === Object.prototype.toString.call(a)
				};
				b.exports = function (a) {
					if (!a)
						return {};
					var b = {};
					return d(c(a).split("\n"), function (a) {
						var d = a.indexOf(":"),
						f = c(a.slice(0, d)).toLowerCase(),
						g = c(a.slice(d + 1));
						"undefined" == typeof b[f] ? b[f] = g : e(b[f]) ? b[f].push(g) : b[f] = [b[f], g]
					}),
					b
				}
			}, {
				"for-each": 59,
				trim: 60
			}
		],
		62: [function (a, b) {
				function c() {
					for (var a = {}, b = 0; b < arguments.length; b++) {
						var c = arguments[b];
						for (var e in c)
							d.call(c, e) && (a[e] = c[e])
					}
					return a
				}
				b.exports = c;
				var d = Object.prototype.hasOwnProperty
			}, {}
		],
		63: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./button.js"),
				h = d(g),
				i = a("./component.js"),
				j = d(i),
				k = function (a) {
					function b(c, d) {
						e(this, b),
						a.call(this, c, d)
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-big-play-button"
					},
					b.prototype.handleClick = function () {
						this.player_.play()
					},
					b
				}
				(h["default"]);
				k.prototype.controlText_ = "Play Video",
				j["default"].registerComponent("BigPlayButton", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"./button.js": 64,
				"./component.js": 67
			}
		],
		64: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./clickable-component.js"),
				i = e(h),
				j = a("./component"),
				k = e(j),
				l = a("./utils/events.js"),
				m = (d(l), a("./utils/fn.js")),
				n = (d(m), a("./utils/log.js")),
				o = e(n),
				p = a("global/document"),
				q = (e(p), a("object.assign")),
				r = e(q),
				s = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var a = arguments.length <= 0 || void 0 === arguments[0] ? "button" : arguments[0],
						b = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1],
						c = arguments.length <= 2 || void 0 === arguments[2] ? {}
						 : arguments[2];
						b = r["default"]({
								className: this.buildCSSClass()
							}, b),
						"button" !== a && (o["default"].warn("Creating a Button with an HTML element of " + a + " is deprecated; use ClickableComponent instead."), b = r["default"]({
									tabIndex: 0
								}, b), c = r["default"]({
									role: "button"
								}, c)),
						c = r["default"]({
								type: "button",
								"aria-live": "polite"
							}, c);
						var d = k["default"].prototype.createEl.call(this, a, b, c);
						return this.createControlTextEl(d),
						d
					},
					b.prototype.addChild = function (a) {
						var b = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1],
						c = this.constructor.name;
						return o["default"].warn("Adding an actionable (user controllable) child to a Button (" + c + ") is not supported; use a ClickableComponent instead."),
						k["default"].prototype.addChild.call(this, a, b)
					},
					b.prototype.handleKeyPress = function (b) {
						32 === b.which || 13 === b.which || a.prototype.handleKeyPress.call(this, b)
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("Button", s),
				c["default"] = s,
				b.exports = c["default"]
			}, {
				"./clickable-component.js": 65,
				"./component": 67,
				"./utils/events.js": 144,
				"./utils/fn.js": 145,
				"./utils/log.js": 148,
				"global/document": 1,
				"object.assign": 45
			}
		],
		65: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./component"),
				i = e(h),
				j = a("./utils/dom.js"),
				k = d(j),
				l = a("./utils/events.js"),
				m = d(l),
				n = a("./utils/fn.js"),
				o = d(n),
				p = a("./utils/log.js"),
				q = e(p),
				r = a("global/document"),
				s = e(r),
				t = a("object.assign"),
				u = e(t),
				v = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.emitTapEvents(),
						this.on("tap", this.handleClick),
						this.on("click", this.handleClick),
						this.on("focus", this.handleFocus),
						this.on("blur", this.handleBlur)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var b = arguments.length <= 0 || void 0 === arguments[0] ? "div" : arguments[0],
						c = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1],
						d = arguments.length <= 2 || void 0 === arguments[2] ? {}
						 : arguments[2];
						c = u["default"]({
								className: this.buildCSSClass(),
								tabIndex: 0
							}, c),
						"button" === b && q["default"].error("Creating a ClickableComponent with an HTML element of " + b + " is not supported; use a Button instead."),
						d = u["default"]({
								role: "button",
								"aria-live": "polite"
							}, d);
						var e = a.prototype.createEl.call(this, b, c, d);
						return this.createControlTextEl(e),
						e
					},
					b.prototype.createControlTextEl = function (a) {
						return this.controlTextEl_ = k.createEl("span", {
								className: "vjs-control-text"
							}),
						a && a.appendChild(this.controlTextEl_),
						this.controlText(this.controlText_),
						this.controlTextEl_
					},
					b.prototype.controlText = function (a) {
						return a ? (this.controlText_ = a, this.controlTextEl_.innerHTML = this.localize(this.controlText_), this) : this.controlText_ || "Need Text"
					},
					b.prototype.buildCSSClass = function () {
						return "vjs-control vjs-button " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.addChild = function (b) {
						var c = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1];
						return a.prototype.addChild.call(this, b, c)
					},
					b.prototype.enable = function () {
						return this.removeClass("vjs-disabled"),
						this.el_.setAttribute("aria-disabled", "false"),
						this
					},
					b.prototype.disable = function () {
						return this.addClass("vjs-disabled"),
						this.el_.setAttribute("aria-disabled", "true"),
						this
					},
					b.prototype.handleClick = function () {},
					b.prototype.handleFocus = function () {
						m.on(s["default"], "keydown", o.bind(this, this.handleKeyPress))
					},
					b.prototype.handleKeyPress = function (b) {
						32 === b.which || 13 === b.which ? (b.preventDefault(), this.handleClick(b)) : a.prototype.handleKeyPress && a.prototype.handleKeyPress.call(this, b)
					},
					b.prototype.handleBlur = function () {
						m.off(s["default"], "keydown", o.bind(this, this.handleKeyPress))
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("ClickableComponent", v),
				c["default"] = v,
				b.exports = c["default"]
			}, {
				"./component": 67,
				"./utils/dom.js": 143,
				"./utils/events.js": 144,
				"./utils/fn.js": 145,
				"./utils/log.js": 148,
				"global/document": 1,
				"object.assign": 45
			}
		],
		66: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./button"),
				h = d(g),
				i = a("./component"),
				j = d(i),
				k = function (a) {
					function b(c, d) {
						e(this, b),
						a.call(this, c, d),
						this.controlText(d && d.controlText || this.localize("Close"))
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-close-button " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.handleClick = function () {
						this.trigger({
							type: "close",
							bubbles: !1
						})
					},
					b
				}
				(h["default"]);
				j["default"].registerComponent("CloseButton", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"./button": 64,
				"./component": 67
			}
		],
		67: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				c.__esModule = !0;
				var g = a("global/window"),
				h = e(g),
				i = a("./utils/dom.js"),
				j = d(i),
				k = a("./utils/fn.js"),
				l = d(k),
				m = a("./utils/guid.js"),
				n = d(m),
				o = a("./utils/events.js"),
				p = d(o),
				q = a("./utils/log.js"),
				r = e(q),
				s = a("./utils/to-title-case.js"),
				t = e(s),
				u = a("object.assign"),
				v = e(u),
				w = a("./utils/merge-options.js"),
				x = e(w),
				y = function () {
					function a(b, c, d) {
						if (f(this, a), this.player_ = !b && this.play ? b = this : b, this.options_ = x["default"]({}, this.options_), c = this.options_ = x["default"](this.options_, c), this.id_ = c.id || c.el && c.el.id, !this.id_) {
							var e = b && b.id && b.id() || "no_player";
							this.id_ = e + "_component_" + n.newGUID()
						}
						this.name_ = c.name || null,
						c.el ? this.el_ = c.el : c.createEl !== !1 && (this.el_ = this.createEl()),
						this.children_ = [],
						this.childIndex_ = {},
						this.childNameIndex_ = {},
						c.initChildren !== !1 && this.initChildren(),
						this.ready(d),
						c.reportTouchActivity !== !1 && this.enableTouchActivity()
					}
					return a.prototype.dispose = function () {
						if (this.trigger({
								type: "dispose",
								bubbles: !1
							}), this.children_)
							for (var a = this.children_.length - 1; a >= 0; a--)
								this.children_[a].dispose && this.children_[a].dispose();
						this.children_ = null,
						this.childIndex_ = null,
						this.childNameIndex_ = null,
						this.off(),
						this.el_.parentNode && this.el_.parentNode.removeChild(this.el_),
						j.removeElData(this.el_),
						this.el_ = null
					},
					a.prototype.player = function () {
						return this.player_
					},
					a.prototype.options = function (a) {
						return r["default"].warn("this.options() has been deprecated and will be moved to the constructor in 6.0"),
						a ? (this.options_ = x["default"](this.options_, a), this.options_) : this.options_
					},
					a.prototype.el = function () {
						return this.el_
					},
					a.prototype.createEl = function (a, b, c) {
						return j.createEl(a, b, c)
					},
					a.prototype.localize = function (a) {
						var b = this.player_.language && this.player_.language(),
						c = this.player_.languages && this.player_.languages();
						if (!b || !c)
							return a;
						var d = c[b];
						if (d && d[a])
							return d[a];
						var e = b.split("-")[0],
						f = c[e];
						return f && f[a] ? f[a] : a
					},
					a.prototype.contentEl = function () {
						return this.contentEl_ || this.el_
					},
					a.prototype.id = function () {
						return this.id_
					},
					a.prototype.name = function () {
						return this.name_
					},
					a.prototype.children = function () {
						return this.children_
					},
					a.prototype.getChildById = function (a) {
						return this.childIndex_[a]
					},
					a.prototype.getChild = function (a) {
						return this.childNameIndex_[a]
					},
					a.prototype.addChild = function (b) {
						var c = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1],
						d = arguments.length <= 2 || void 0 === arguments[2] ? this.children_.length : arguments[2],
						e = void 0,
						f = void 0;
						if ("string" == typeof b) {
							f = b,
							c || (c = {}),
							c === !0 && (r["default"].warn("Initializing a child component with `true` is deprecated. Children should be defined in an array when possible, but if necessary use an object instead of `true`."), c = {});
							var g = c.componentClass || t["default"](f);
							c.name = f;
							var h = a.getComponent(g);
							if (!h)
								throw new Error("Component " + g + " does not exist");
							if ("function" != typeof h)
								return null;
							e = new h(this.player_ || this, c)
						} else
							e = b;
						if (this.children_.splice(d, 0, e), "function" == typeof e.id && (this.childIndex_[e.id()] = e), f = f || e.name && e.name(), f && (this.childNameIndex_[f] = e), "function" == typeof e.el && e.el()) {
							var i = this.contentEl().children,
							j = i[d] || null;
							this.contentEl().insertBefore(e.el(), j)
						}
						return e
					},
					a.prototype.removeChild = function (a) {
						if ("string" == typeof a && (a = this.getChild(a)), a && this.children_) {
							for (var b = !1, c = this.children_.length - 1; c >= 0; c--)
								if (this.children_[c] === a) {
									b = !0,
									this.children_.splice(c, 1);
									break
								}
							if (b) {
								this.childIndex_[a.id()] = null,
								this.childNameIndex_[a.name()] = null;
								var d = a.el();
								d && d.parentNode === this.contentEl() && this.contentEl().removeChild(a.el())
							}
						}
					},
					a.prototype.initChildren = function () {
						var b = this,
						c = this.options_.children;
						c && !function () {
							var d = b.options_,
							e = function (a) {
								var c = a.name,
								e = a.opts;
								if (void 0 !== d[c] && (e = d[c]), e !== !1) {
									e === !0 && (e = {}),
									e.playerOptions = b.options_.playerOptions;
									var f = b.addChild(c, e);
									f && (b[c] = f)
								}
							},
							f = void 0,
							g = a.getComponent("Tech");
							f = Array.isArray(c) ? c : Object.keys(c),
							f.concat(Object.keys(b.options_).filter(function (a) {
									return !f.some(function (b) {
										return "string" == typeof b ? a === b : a === b.name
									})
								})).map(function (a) {
								var d = void 0,
								e = void 0;
								return "string" == typeof a ? (d = a, e = c[d] || b.options_[d] || {}) : (d = a.name, e = a), {
									name: d,
									opts: e
								}
							}).filter(function (b) {
								var c = a.getComponent(b.opts.componentClass || t["default"](b.name));
								return c && !g.isTech(c)
							}).forEach(e)
						}
						()
					},
					a.prototype.buildCSSClass = function () {
						return ""
					},
					a.prototype.on = function (a, b, c) {
						var d = this;
						return "string" == typeof a || Array.isArray(a) ? p.on(this.el_, a, l.bind(this, b)) : !function () {
							var e = a,
							f = b,
							g = l.bind(d, c),
							h = function () {
								return d.off(e, f, g)
							};
							h.guid = g.guid,
							d.on("dispose", h);
							var i = function () {
								return d.off("dispose", h)
							};
							i.guid = g.guid,
							a.nodeName ? (p.on(e, f, g), p.on(e, "dispose", i)) : "function" == typeof a.on && (e.on(f, g), e.on("dispose", i))
						}
						(),
						this
					},
					a.prototype.off = function (a, b, c) {
						if (!a || "string" == typeof a || Array.isArray(a))
							p.off(this.el_, a, b);
						else {
							var d = a,
							e = b,
							f = l.bind(this, c);
							this.off("dispose", f),
							a.nodeName ? (p.off(d, e, f), p.off(d, "dispose", f)) : (d.off(e, f), d.off("dispose", f))
						}
						return this
					},
					a.prototype.one = function (a, b, c) {
						var d = this,
						e = arguments;
						return "string" == typeof a || Array.isArray(a) ? p.one(this.el_, a, l.bind(this, b)) : !function () {
							var f = a,
							g = b,
							h = l.bind(d, c),
							i = function j() {
								d.off(f, g, j),
								h.apply(null, e)
							};
							i.guid = h.guid,
							d.on(f, g, i)
						}
						(),
						this
					},
					a.prototype.trigger = function (a, b) {
						return p.trigger(this.el_, a, b),
						this
					},
					a.prototype.ready = function (a) {
						var b = arguments.length <= 1 || void 0 === arguments[1] ? !1 : arguments[1];
						return a && (this.isReady_ ? b ? a.call(this) : this.setTimeout(a, 1) : (this.readyQueue_ = this.readyQueue_ || [], this.readyQueue_.push(a))),
						this
					},
					a.prototype.triggerReady = function () {
						this.isReady_ = !0,
						this.setTimeout(function () {
							var a = this.readyQueue_;
							this.readyQueue_ = [],
							a && a.length > 0 && a.forEach(function (a) {
								a.call(this)
							}, this),
							this.trigger("ready")
						}, 1)
					},
					a.prototype.$ = function (a, b) {
						return j.$(a, b || this.contentEl())
					},
					a.prototype.$$ = function (a, b) {
						return j.$$(a, b || this.contentEl())
					},
					a.prototype.hasClass = function (a) {
						return j.hasElClass(this.el_, a)
					},
					a.prototype.addClass = function (a) {
						return j.addElClass(this.el_, a),
						this
					},
					a.prototype.removeClass = function (a) {
						return j.removeElClass(this.el_, a),
						this
					},
					a.prototype.toggleClass = function (a, b) {
						return j.toggleElClass(this.el_, a, b),
						this
					},
					a.prototype.show = function () {
						return this.removeClass("vjs-hidden"),
						this
					},
					a.prototype.hide = function () {
						return this.addClass("vjs-hidden"),
						this
					},
					a.prototype.lockShowing = function () {
						return this.addClass("vjs-lock-showing"),
						this
					},
					a.prototype.unlockShowing = function () {
						return this.removeClass("vjs-lock-showing"),
						this
					},
					a.prototype.width = function (a, b) {
						return this.dimension("width", a, b)
					},
					a.prototype.height = function (a, b) {
						return this.dimension("height", a, b)
					},
					a.prototype.dimensions = function (a, b) {
						return this.width(a, !0).height(b)
					},
					a.prototype.dimension = function (a, b, c) {
						if (void 0 !== b)
							return (null === b || b !== b) && (b = 0), this.el_.style[a] = -1 !== ("" + b).indexOf("%") || -1 !== ("" + b).indexOf("px") ? b : "auto" === b ? "" : b + "px", c || this.trigger("resize"), this;
						if (!this.el_)
							return 0;
						var d = this.el_.style[a],
						e = d.indexOf("px");
						return -1 !== e ? parseInt(d.slice(0, e), 10) : parseInt(this.el_["offset" + t["default"](a)], 10)
					},
					a.prototype.currentDimension = function (a) {
						var b = 0;
						if ("width" !== a && "height" !== a)
							throw new Error("currentDimension only accepts width or height value");
						if ("function" == typeof h["default"].getComputedStyle) {
							var c = h["default"].getComputedStyle(this.el_);
							b = c.getPropertyValue(a) || c[a]
						} else if (this.el_.currentStyle) {
							var d = "offset" + t["default"](a);
							b = this.el_[d]
						}
						return b = parseFloat(b)
					},
					a.prototype.currentDimensions = function () {
						return {
							width: this.currentDimension("width"),
							height: this.currentDimension("height")
						}
					},
					a.prototype.currentWidth = function () {
						return this.currentDimension("width")
					},
					a.prototype.currentHeight = function () {
						return this.currentDimension("height")
					},
					a.prototype.emitTapEvents = function () {
						var a = 0,
						b = null,
						c = 10,
						d = 200,
						e = void 0;
						this.on("touchstart", function (c) {
							1 === c.touches.length && (b = v["default"]({}, c.touches[0]), a = (new Date).getTime(), e = !0)
						}),
						this.on("touchmove", function (a) {
							if (a.touches.length > 1)
								e = !1;
							else if (b) {
								var d = a.touches[0].pageX - b.pageX,
								f = a.touches[0].pageY - b.pageY,
								g = Math.sqrt(d * d + f * f);
								g > c && (e = !1)
							}
						});
						var f = function () {
							e = !1
						};
						this.on("touchleave", f),
						this.on("touchcancel", f),
						this.on("touchend", function (c) {
							if (b = null, e === !0) {
								var f = (new Date).getTime() - a;
								d > f && (c.preventDefault(), this.trigger("tap"))
							}
						})
					},
					a.prototype.enableTouchActivity = function () {
						if (this.player() && this.player().reportUserActivity) {
							var a = l.bind(this.player(), this.player().reportUserActivity),
							b = void 0;
							this.on("touchstart", function () {
								a(),
								this.clearInterval(b),
								b = this.setInterval(a, 250)
							});
							var c = function () {
								a(),
								this.clearInterval(b)
							};
							this.on("touchmove", a),
							this.on("touchend", c),
							this.on("touchcancel", c)
						}
					},
					a.prototype.setTimeout = function (a, b) {
						a = l.bind(this, a);
						var c = h["default"].setTimeout(a, b),
						d = function () {
							this.clearTimeout(c)
						};
						return d.guid = "vjs-timeout-" + c,
						this.on("dispose", d),
						c
					},
					a.prototype.clearTimeout = function (a) {
						h["default"].clearTimeout(a);
						var b = function () {};
						return b.guid = "vjs-timeout-" + a,
						this.off("dispose", b),
						a
					},
					a.prototype.setInterval = function (a, b) {
						a = l.bind(this, a);
						var c = h["default"].setInterval(a, b),
						d = function () {
							this.clearInterval(c)
						};
						return d.guid = "vjs-interval-" + c,
						this.on("dispose", d),
						c
					},
					a.prototype.clearInterval = function (a) {
						h["default"].clearInterval(a);
						var b = function () {};
						return b.guid = "vjs-interval-" + a,
						this.off("dispose", b),
						a
					},
					a.registerComponent = function (b, c) {
						return a.components_ || (a.components_ = {}),
						a.components_[b] = c,
						c
					},
					a.getComponent = function (b) {
						return a.components_ && a.components_[b] ? a.components_[b] : h["default"] && h["default"].videojs && h["default"].videojs[b] ? (r["default"].warn("The " + b + " component was added to the videojs object when it should be registered using videojs.registerComponent(name, component)"), h["default"].videojs[b]) : void 0
					},
					a.extend = function (b) {
						b = b || {},
						r["default"].warn("Component.extend({}) has been deprecated, use videojs.extend(Component, {}) instead");
						var c = b.init || b.init || this.prototype.init || this.prototype.init || function () {},
						d = function () {
							c.apply(this, arguments)
						};
						d.prototype = Object.create(this.prototype),
						d.prototype.constructor = d,
						d.extend = a.extend;
						for (var e in b)
							b.hasOwnProperty(e) && (d.prototype[e] = b[e]);
						return d
					},
					a
				}
				();
				y.registerComponent("Component", y),
				c["default"] = y,
				b.exports = c["default"]
			}, {
				"./utils/dom.js": 143,
				"./utils/events.js": 144,
				"./utils/fn.js": 145,
				"./utils/guid.js": 147,
				"./utils/log.js": 148,
				"./utils/merge-options.js": 149,
				"./utils/to-title-case.js": 152,
				"global/window": 2,
				"object.assign": 45
			}
		],
		68: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../track-button.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/fn.js"),
				m = (d(l), a("./audio-track-menu-item.js")),
				n = e(m),
				o = function (a) {
					function b(c) {
						var d = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1];
						f(this, b),
						d.tracks = c.audioTracks && c.audioTracks(),
						a.call(this, c, d),
						this.el_.setAttribute("aria-label", "Audio Menu")
					}
					return g(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-audio-button " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.createItems = function () {
						var a = arguments.length <= 0 || void 0 === arguments[0] ? [] : arguments[0],
						b = this.player_.audioTracks && this.player_.audioTracks();
						if (!b)
							return a;
						for (var c = 0; c < b.length; c++) {
							var d = b[c];
							a.push(new n["default"](this.player_, {
									selectable: !0,
									track: d
								}))
						}
						return a
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("AudioTrackButton", o),
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/fn.js": 145,
				"../track-button.js": 98,
				"./audio-track-menu-item.js": 69
			}
		],
		69: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../menu/menu-item.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/fn.js"),
				m = d(l),
				n = function (a) {
					function b(c, d) {
						var e = this;
						f(this, b);
						var g = d.track,
						h = c.audioTracks();
						d.label = g.label || g.language || "Unknown",
						d.selected = g.enabled,
						a.call(this, c, d),
						this.track = g,
						h && !function () {
							var a = m.bind(e, e.handleTracksChange);
							h.addEventListener("change", a),
							e.on("dispose", function () {
								h.removeEventListener("change", a)
							})
						}
						()
					}
					return g(b, a),
					b.prototype.handleClick = function (b) {
						var c = this.player_.audioTracks();
						if (a.prototype.handleClick.call(this, b), c)
							for (var d = 0; d < c.length; d++) {
								var e = c[d];
								e === this.track && (e.enabled = !0)
							}
					},
					b.prototype.handleTracksChange = function () {
						this.selected(this.track.enabled)
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("AudioTrackMenuItem", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../menu/menu-item.js": 110,
				"../../utils/fn.js": 145
			}
		],
		70: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../component.js"),
				h = d(g),
				i = a("./play-toggle.js"),
				j = (d(i), a("./time-controls/current-time-display.js")),
				k = (d(j), a("./time-controls/duration-display.js")),
				l = (d(k), a("./time-controls/time-divider.js")),
				m = (d(l), a("./time-controls/remaining-time-display.js")),
				n = (d(m), a("./live-display.js")),
				o = (d(n), a("./progress-control/progress-control.js")),
				p = (d(o), a("./fullscreen-toggle.js")),
				q = (d(p), a("./volume-control/volume-control.js")),
				r = (d(q), a("./volume-menu-button.js")),
				s = (d(r), a("./mute-toggle.js")),
				t = (d(s), a("./text-track-controls/chapters-button.js")),
				u = (d(t), a("./text-track-controls/descriptions-button.js")),
				v = (d(u), a("./text-track-controls/subtitles-button.js")),
				w = (d(v), a("./text-track-controls/captions-button.js")),
				x = (d(w), a("./audio-track-controls/audio-track-button.js")),
				y = (d(x), a("./playback-rate-menu/playback-rate-menu-button.js")),
				z = (d(y), a("./spacer-controls/custom-control-spacer.js")),
				A = (d(z), function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-control-bar",
							dir: "ltr"
						}, {
							role: "group"
						})
					},
					b
				}
					(h["default"]));
				A.prototype.options_ = {
					children: ["playToggle", "volumeMenuButton", "currentTimeDisplay", "timeDivider", "durationDisplay", "progressControl", "liveDisplay", "remainingTimeDisplay", "customControlSpacer", "playbackRateMenuButton", "chaptersButton", "descriptionsButton", "subtitlesButton", "captionsButton", "audioTrackButton", "fullscreenToggle"]
				},
				h["default"].registerComponent("ControlBar", A),
				c["default"] = A,
				b.exports = c["default"]
			}, {
				"../component.js": 67,
				"./audio-track-controls/audio-track-button.js": 68,
				"./fullscreen-toggle.js": 71,
				"./live-display.js": 72,
				"./mute-toggle.js": 73,
				"./play-toggle.js": 74,
				"./playback-rate-menu/playback-rate-menu-button.js": 75,
				"./progress-control/progress-control.js": 80,
				"./spacer-controls/custom-control-spacer.js": 83,
				"./text-track-controls/captions-button.js": 86,
				"./text-track-controls/chapters-button.js": 87,
				"./text-track-controls/descriptions-button.js": 89,
				"./text-track-controls/subtitles-button.js": 91,
				"./time-controls/current-time-display.js": 94,
				"./time-controls/duration-display.js": 95,
				"./time-controls/remaining-time-display.js": 96,
				"./time-controls/time-divider.js": 97,
				"./volume-control/volume-control.js": 100,
				"./volume-menu-button.js": 102
			}
		],
		71: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../button.js"),
				h = d(g),
				i = a("../component.js"),
				j = d(i),
				k = function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-fullscreen-control " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.handleClick = function () {
						this.player_.isFullscreen() ? (this.player_.exitFullscreen(), this.controlText("Fullscreen")) : (this.player_.requestFullscreen(), this.controlText("Non-Fullscreen"))
					},
					b
				}
				(h["default"]);
				k.prototype.controlText_ = "Fullscreen",
				j["default"].registerComponent("FullscreenToggle", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../button.js": 64,
				"../component.js": 67
			}
		],
		72: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../component"),
				i = e(h),
				j = a("../utils/dom.js"),
				k = d(j),
				l = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.updateShowing(),
						this.on(this.player(), "durationchange", this.updateShowing)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var b = a.prototype.createEl.call(this, "div", {
								className: "vjs-live-control vjs-control"
							});
						return this.contentEl_ = k.createEl("div", {
								className: "vjs-live-display",
								innerHTML: '<span class="vjs-control-text">' + this.localize("Stream Type") + "</span>" + this.localize("LIVE")
							}, {
								"aria-live": "off"
							}),
						b.appendChild(this.contentEl_),
						b
					},
					b.prototype.updateShowing = function () {
						this.player().duration() === 1 / 0 ? this.show() : this.hide()
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("LiveDisplay", l),
				c["default"] = l,
				b.exports = c["default"]
			}, {
				"../component": 67,
				"../utils/dom.js": 143
			}
		],
		73: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../button"),
				i = e(h),
				j = a("../component"),
				k = e(j),
				l = a("../utils/dom.js"),
				m = d(l),
				n = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "volumechange", this.update),
						c.tech_ && c.tech_.featuresVolumeControl === !1 && this.addClass("vjs-hidden"),
						this.on(c, "loadstart", function () {
							this.update(),
							c.tech_.featuresVolumeControl === !1 ? this.addClass("vjs-hidden") : this.removeClass("vjs-hidden")
						})
					}
					return g(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-mute-control " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.handleClick = function () {
						this.player_.muted(this.player_.muted() ? !1 : !0)
					},
					b.prototype.update = function () {
						var a = this.player_.volume(),
						b = 3;
						0 === a || this.player_.muted() ? b = 0 : .33 > a ? b = 1 : .67 > a && (b = 2);
						var c = this.player_.muted() ? "Unmute" : "Mute";
						this.controlText() !== c && this.controlText(c);
						for (var d = 0; 4 > d; d++)
							m.removeElClass(this.el_, "vjs-vol-" + d);
						m.addElClass(this.el_, "vjs-vol-" + b)
					},
					b
				}
				(i["default"]);
				n.prototype.controlText_ = "Mute",
				k["default"].registerComponent("MuteToggle", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../button": 64,
				"../component": 67,
				"../utils/dom.js": 143
			}
		],
		74: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../button.js"),
				h = d(g),
				i = a("../component.js"),
				j = d(i),
				k = function (a) {
					function b(c, d) {
						e(this, b),
						a.call(this, c, d),
						this.on(c, "play", this.handlePlay),
						this.on(c, "pause", this.handlePause)
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-play-control " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.handleClick = function () {
						this.player_.paused() ? this.player_.play() : this.player_.pause()
					},
					b.prototype.handlePlay = function () {
						this.removeClass("vjs-paused"),
						this.addClass("vjs-playing"),
						this.controlText("Pause")
					},
					b.prototype.handlePause = function () {
						this.removeClass("vjs-playing"),
						this.addClass("vjs-paused"),
						this.controlText("Play")
					},
					b
				}
				(h["default"]);
				k.prototype.controlText_ = "Play",
				j["default"].registerComponent("PlayToggle", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../button.js": 64,
				"../component.js": 67
			}
		],
		75: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../menu/menu-button.js"),
				i = e(h),
				j = a("../../menu/menu.js"),
				k = e(j),
				l = a("./playback-rate-menu-item.js"),
				m = e(l),
				n = a("../../component.js"),
				o = e(n),
				p = a("../../utils/dom.js"),
				q = d(p),
				r = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.updateVisibility(),
						this.updateLabel(),
						this.on(c, "loadstart", this.updateVisibility),
						this.on(c, "ratechange", this.updateLabel)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var b = a.prototype.createEl.call(this);
						return this.labelEl_ = q.createEl("div", {
								className: "vjs-playback-rate-value",
								innerHTML: 1
							}),
						b.appendChild(this.labelEl_),
						b
					},
					b.prototype.buildCSSClass = function () {
						return "vjs-playback-rate " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.createMenu = function () {
						var a = new k["default"](this.player()),
						b = this.playbackRates();
						if (b)
							for (var c = b.length - 1; c >= 0; c--)
								a.addChild(new m["default"](this.player(), {
										rate: b[c] + "x"
									}));
						return a
					},
					b.prototype.updateARIAAttributes = function () {
						this.el().setAttribute("aria-valuenow", this.player().playbackRate())
					},
					b.prototype.handleClick = function () {
						for (var a = this.player().playbackRate(), b = this.playbackRates(), c = b[0], d = 0; d < b.length; d++)
							if (b[d] > a) {
								c = b[d];
								break
							}
						this.player().playbackRate(c)
					},
					b.prototype.playbackRates = function () {
						return this.options_.playbackRates || this.options_.playerOptions && this.options_.playerOptions.playbackRates
					},
					b.prototype.playbackRateSupported = function () {
						return this.player().tech_ && this.player().tech_.featuresPlaybackRate && this.playbackRates() && this.playbackRates().length > 0
					},
					b.prototype.updateVisibility = function () {
						this.playbackRateSupported() ? this.removeClass("vjs-hidden") : this.addClass("vjs-hidden")
					},
					b.prototype.updateLabel = function () {
						this.playbackRateSupported() && (this.labelEl_.innerHTML = this.player().playbackRate() + "x")
					},
					b
				}
				(i["default"]);
				r.prototype.controlText_ = "Playback Rate",
				o["default"].registerComponent("PlaybackRateMenuButton", r),
				c["default"] = r,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../menu/menu-button.js": 109,
				"../../menu/menu.js": 111,
				"../../utils/dom.js": 143,
				"./playback-rate-menu-item.js": 76
			}
		],
		76: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../../menu/menu-item.js"),
				h = d(g),
				i = a("../../component.js"),
				j = d(i),
				k = function (a) {
					function b(c, d) {
						e(this, b);
						var f = d.rate,
						g = parseFloat(f, 10);
						d.label = f,
						d.selected = 1 === g,
						a.call(this, c, d),
						this.label = f,
						this.rate = g,
						this.on(c, "ratechange", this.update)
					}
					return f(b, a),
					b.prototype.handleClick = function () {
						a.prototype.handleClick.call(this),
						this.player().playbackRate(this.rate)
					},
					b.prototype.update = function () {
						this.selected(this.player().playbackRate() === this.rate)
					},
					b
				}
				(h["default"]);
				k.prototype.contentElType = "button",
				j["default"].registerComponent("PlaybackRateMenuItem", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../menu/menu-item.js": 110
			}
		],
		77: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../component.js"),
				i = e(h),
				j = a("../../utils/dom.js"),
				k = d(j),
				l = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "progress", this.update)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-load-progress",
							innerHTML: '<span class="vjs-control-text"><span>' + this.localize("Loaded") + "</span>: 0%</span>"
						})
					},
					b.prototype.update = function () {
						var a = this.player_.buffered(),
						b = this.player_.duration(),
						c = this.player_.bufferedEnd(),
						d = this.el_.children,
						e = function (a, b) {
							var c = a / b || 0;
							return 100 * (c >= 1 ? 1 : c) + "%"
						};
						this.el_.style.width = e(c, b);
						for (var f = 0; f < a.length; f++) {
							var g = a.start(f),
							h = a.end(f),
							i = d[f];
							i || (i = this.el_.appendChild(k.createEl())),
							i.style.left = e(g, c),
							i.style.width = e(h - g, c)
						}
						for (var f = d.length; f > a.length; f--)
							this.el_.removeChild(d[f - 1])
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("LoadProgressBar", l),
				c["default"] = l,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/dom.js": 143
			}
		],
		78: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("global/window"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/dom.js"),
				m = d(l),
				n = a("../../utils/fn.js"),
				o = d(n),
				p = a("../../utils/format-time.js"),
				q = e(p),
				r = a("lodash-compat/function/throttle"),
				s = e(r),
				t = function (a) {
					function b(c, d) {
						var e = this;
						f(this, b),
						a.call(this, c, d),
						d.playerOptions && d.playerOptions.controlBar && d.playerOptions.controlBar.progressControl && d.playerOptions.controlBar.progressControl.keepTooltipsInside && (this.keepTooltipsInside = d.playerOptions.controlBar.progressControl.keepTooltipsInside),
						this.keepTooltipsInside && (this.tooltip = m.createEl("div", {
									className: "vjs-time-tooltip"
								}), this.el().appendChild(this.tooltip), this.addClass("vjs-keep-tooltips-inside")),
						this.update(0, 0),
						c.on("ready", function () {
							e.on(c.controlBar.progressControl.el(), "mousemove", s["default"](o.bind(e, e.handleMouseMove), 25))
						})
					}
					return g(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-mouse-display"
						})
					},
					b.prototype.handleMouseMove = function (a) {
						var b = this.player_.duration(),
						c = this.calculateDistance(a) * b,
						d = a.pageX - m.findElPosition(this.el().parentNode).left;
						this.update(c, d)
					},
					b.prototype.update = function (a, b) {
						var c = q["default"](a, this.player_.duration());
						if (this.el().style.left = b + "px", this.el().setAttribute("data-current-time", c), this.keepTooltipsInside) {
							var d = this.clampPosition_(b),
							e = b - d + 1,
							f = parseFloat(i["default"].getComputedStyle(this.tooltip).width),
							g = f / 2;
							this.tooltip.innerHTML = c,
							this.tooltip.style.right = "-" + (g - e) + "px"
						}
					},
					b.prototype.calculateDistance = function (a) {
						return m.getPointerPosition(this.el().parentNode, a).x
					},
					b.prototype.clampPosition_ = function (a) {
						if (!this.keepTooltipsInside)
							return a;
						var b = parseFloat(i["default"].getComputedStyle(this.player().el()).width),
						c = parseFloat(i["default"].getComputedStyle(this.tooltip).width),
						d = c / 2,
						e = a;
						return d > a ? e = Math.ceil(d) : a > b - d && (e = Math.floor(b - d)),
						e
					},
					b
				}
				(k["default"]);
				k["default"].registerComponent("MouseTimeDisplay", t),
				c["default"] = t,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/dom.js": 143,
				"../../utils/fn.js": 145,
				"../../utils/format-time.js": 146,
				"global/window": 2,
				"lodash-compat/function/throttle": 7
			}
		],
		79: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../component.js"),
				i = e(h),
				j = a("../../utils/fn.js"),
				k = d(j),
				l = a("../../utils/dom.js"),
				m = (d(l), a("../../utils/format-time.js")),
				n = e(m),
				o = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.updateDataAttr(),
						this.on(c, "timeupdate", this.updateDataAttr),
						c.ready(k.bind(this, this.updateDataAttr)),
						d.playerOptions && d.playerOptions.controlBar && d.playerOptions.controlBar.progressControl && d.playerOptions.controlBar.progressControl.keepTooltipsInside && (this.keepTooltipsInside = d.playerOptions.controlBar.progressControl.keepTooltipsInside),
						this.keepTooltipsInside && this.addClass("vjs-keep-tooltips-inside")
					}
					return g(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-play-progress vjs-slider-bar",
							innerHTML: '<span class="vjs-control-text"><span>' + this.localize("Progress") + "</span>: 0%</span>"
						})
					},
					b.prototype.updateDataAttr = function () {
						var a = this.player_.scrubbing() ? this.player_.getCache().currentTime : this.player_.currentTime();
						this.el_.setAttribute("data-current-time", n["default"](a, this.player_.duration()))
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("PlayProgressBar", o),
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/dom.js": 143,
				"../../utils/fn.js": 145,
				"../../utils/format-time.js": 146
			}
		],
		80: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../../component.js"),
				h = d(g),
				i = a("./seek-bar.js"),
				j = (d(i), a("./mouse-time-display.js")),
				k = (d(j), function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-progress-control vjs-control"
						})
					},
					b
				}
					(h["default"]));
				k.prototype.options_ = {
					children: ["seekBar"]
				},
				h["default"].registerComponent("ProgressControl", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"./mouse-time-display.js": 78,
				"./seek-bar.js": 81
			}
		],
		81: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("global/window"),
				i = e(h),
				j = a("../../slider/slider.js"),
				k = e(j),
				l = a("../../component.js"),
				m = e(l),
				n = a("./load-progress-bar.js"),
				o = (e(n), a("./play-progress-bar.js")),
				p = (e(o), a("./tooltip-progress-bar.js")),
				q = (e(p), a("../../utils/fn.js")),
				r = d(q),
				s = a("../../utils/format-time.js"),
				t = e(s),
				u = a("object.assign"),
				v = (e(u), function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "timeupdate", this.updateProgress),
						this.on(c, "ended", this.updateProgress),
						c.ready(r.bind(this, this.updateProgress)),
						d.playerOptions && d.playerOptions.controlBar && d.playerOptions.controlBar.progressControl && d.playerOptions.controlBar.progressControl.keepTooltipsInside && (this.keepTooltipsInside = d.playerOptions.controlBar.progressControl.keepTooltipsInside),
						this.keepTooltipsInside && (this.tooltipProgressBar = this.addChild("TooltipProgressBar"))
					}
					return g(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-progress-holder"
						}, {
							"aria-label": "progress bar"
						})
					},
					b.prototype.updateProgress = function () {
						if (this.updateAriaAttributes(this.el_), this.keepTooltipsInside) {
							this.updateAriaAttributes(this.tooltipProgressBar.el_),
							this.tooltipProgressBar.el_.style.width = this.bar.el_.style.width;
							var a = parseFloat(i["default"].getComputedStyle(this.player().el()).width),
							b = parseFloat(i["default"].getComputedStyle(this.tooltipProgressBar.tooltip).width),
							c = this.tooltipProgressBar.el().style;
							c.maxWidth = Math.floor(a - b / 2) + "px",
							c.minWidth = Math.ceil(b / 2) + "px",
							c.right = "-" + b / 2 + "px"
						}
					},
					b.prototype.updateAriaAttributes = function (a) {
						var b = this.player_.scrubbing() ? this.player_.getCache().currentTime : this.player_.currentTime();
						a.setAttribute("aria-valuenow", (100 * this.getPercent()).toFixed(2)),
						a.setAttribute("aria-valuetext", t["default"](b, this.player_.duration()))
					},
					b.prototype.getPercent = function () {
						var a = this.player_.currentTime() / this.player_.duration();
						return a >= 1 ? 1 : a
					},
					b.prototype.handleMouseDown = function (b) {
						a.prototype.handleMouseDown.call(this, b),
						this.player_.scrubbing(!0),
						this.videoWasPlaying = !this.player_.paused(),
						this.player_.pause()
					},
					b.prototype.handleMouseMove = function (a) {
						var b = this.calculateDistance(a) * this.player_.duration();
						b === this.player_.duration() && (b -= .1),
						this.player_.currentTime(b)
					},
					b.prototype.handleMouseUp = function (b) {
						a.prototype.handleMouseUp.call(this, b),
						this.player_.scrubbing(!1),
						this.videoWasPlaying && this.player_.play()
					},
					b.prototype.stepForward = function () {
						this.player_.currentTime(this.player_.currentTime() + 5)
					},
					b.prototype.stepBack = function () {
						this.player_.currentTime(this.player_.currentTime() - 5)
					},
					b
				}
					(k["default"]));
				v.prototype.options_ = {
					children: ["loadProgressBar", "mouseTimeDisplay", "playProgressBar"],
					barName: "playProgressBar"
				},
				v.prototype.playerEvent = "timeupdate",
				m["default"].registerComponent("SeekBar", v),
				c["default"] = v,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../slider/slider.js": 119,
				"../../utils/fn.js": 145,
				"../../utils/format-time.js": 146,
				"./load-progress-bar.js": 77,
				"./play-progress-bar.js": 79,
				"./tooltip-progress-bar.js": 82,
				"global/window": 2,
				"object.assign": 45
			}
		],
		82: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../component.js"),
				i = e(h),
				j = a("../../utils/fn.js"),
				k = d(j),
				l = a("../../utils/dom.js"),
				m = (d(l), a("../../utils/format-time.js")),
				n = e(m),
				o = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.updateDataAttr(),
						this.on(c, "timeupdate", this.updateDataAttr),
						c.ready(k.bind(this, this.updateDataAttr))
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var b = a.prototype.createEl.call(this, "div", {
								className: "vjs-tooltip-progress-bar vjs-slider-bar",
								innerHTML: '<div class="vjs-time-tooltip"></div>\n        <span class="vjs-control-text"><span>' + this.localize("Progress") + "</span>: 0%</span>"
							});
						return this.tooltip = b.querySelector(".vjs-time-tooltip"),
						b
					},
					b.prototype.updateDataAttr = function () {
						var a = this.player_.scrubbing() ? this.player_.getCache().currentTime : this.player_.currentTime(),
						b = n["default"](a, this.player_.duration());
						this.el_.setAttribute("data-current-time", b),
						this.tooltip.innerHTML = b
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("TooltipProgressBar", o),
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/dom.js": 143,
				"../../utils/fn.js": 145,
				"../../utils/format-time.js": 146
			}
		],
		83: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./spacer.js"),
				h = d(g),
				i = a("../../component.js"),
				j = d(i),
				k = function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-custom-control-spacer " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.createEl = function () {
						var b = a.prototype.createEl.call(this, {
								className: this.buildCSSClass()
							});
						return b.innerHTML = "&nbsp;",
						b
					},
					b
				}
				(h["default"]);
				j["default"].registerComponent("CustomControlSpacer", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"./spacer.js": 84
			}
		],
		84: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../../component.js"),
				h = d(g),
				i = function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-spacer " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: this.buildCSSClass()
						})
					},
					b
				}
				(h["default"]);
				h["default"].registerComponent("Spacer", i),
				c["default"] = i,
				b.exports = c["default"]
			}, {
				"../../component.js": 67
			}
		],
		85: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./text-track-menu-item.js"),
				h = d(g),
				i = a("../../component.js"),
				j = d(i),
				k = function (a) {
					function b(c, d) {
						e(this, b),
						d.track = {
							kind: d.kind,
							player: c,
							label: d.kind + " settings",
							selectable: !1,
							"default": !1,
							mode: "disabled"
						},
						d.selectable = !1,
						a.call(this, c, d),
						this.addClass("vjs-texttrack-settings"),
						this.controlText(", opens " + d.kind + " settings dialog")
					}
					return f(b, a),
					b.prototype.handleClick = function () {
						this.player().getChild("textTrackSettings").show(),
						this.player().getChild("textTrackSettings").el_.focus()
					},
					b
				}
				(h["default"]);
				j["default"].registerComponent("CaptionSettingsMenuItem", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"./text-track-menu-item.js": 93
			}
		],
		86: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./text-track-button.js"),
				h = d(g),
				i = a("../../component.js"),
				j = d(i),
				k = a("./caption-settings-menu-item.js"),
				l = d(k),
				m = function (a) {
					function b(c, d, f) {
						e(this, b),
						a.call(this, c, d, f),
						this.el_.setAttribute("aria-label", "Captions Menu")
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-captions-button " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.update = function () {
						var b = 2;
						a.prototype.update.call(this),
						this.player().tech_ && this.player().tech_.featuresNativeTextTracks && (b = 1),
						this.items && this.items.length > b ? this.show() : this.hide()
					},
					b.prototype.createItems = function () {
						var b = [];
						return this.player().tech_ && this.player().tech_.featuresNativeTextTracks || b.push(new l["default"](this.player_, {
								kind: this.kind_
							})),
						a.prototype.createItems.call(this, b)
					},
					b
				}
				(h["default"]);
				m.prototype.kind_ = "captions",
				m.prototype.controlText_ = "Captions",
				j["default"].registerComponent("CaptionsButton", m),
				c["default"] = m,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"./caption-settings-menu-item.js": 85,
				"./text-track-button.js": 92
			}
		],
		87: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./text-track-button.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("./text-track-menu-item.js"),
				m = e(l),
				n = a("./chapters-track-menu-item.js"),
				o = e(n),
				p = a("../../menu/menu.js"),
				q = e(p),
				r = a("../../utils/dom.js"),
				s = d(r),
				t = a("../../utils/fn.js"),
				u = (d(t), a("../../utils/to-title-case.js")),
				v = e(u),
				w = a("global/window"),
				x = (e(w), function (a) {
					function b(c, d, e) {
						f(this, b),
						a.call(this, c, d, e),
						this.el_.setAttribute("aria-label", "Chapters Menu")
					}
					return g(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-chapters-button " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.createItems = function () {
						var a = [],
						b = this.player_.textTracks();
						if (!b)
							return a;
						for (var c = 0; c < b.length; c++) {
							var d = b[c];
							d.kind === this.kind_ && a.push(new m["default"](this.player_, {
									track: d
								}))
						}
						return a
					},
					b.prototype.createMenu = function () {
						for (var a = this, b = this.player_.textTracks() || [], c = void 0, d = this.items || [], e = b.length - 1; e >= 0; e--) {
							var f = b[e];
							if (f.kind === this.kind_) {
								c = f;
								break
							}
						}
						var g = this.menu;
						if (void 0 === g) {
							g = new q["default"](this.player_);
							var h = s.createEl("li", {
									className: "vjs-menu-title",
									innerHTML: v["default"](this.kind_),
									tabIndex: -1
								});
							g.children_.unshift(h),
							s.insertElFirst(h, g.contentEl())
						} else
							d.forEach(function (a) {
								return g.removeChild(a)
							}), d = [];
						if (c && null == c.cues) {
							c.mode = "hidden";
							var i = this.player_.remoteTextTrackEls().getTrackElementByTrack_(c);
							i && i.addEventListener("load", function () {
								return a.update()
							})
						}
						if (c && c.cues && c.cues.length > 0)
							for (var j = c.cues, k = void 0, e = 0, l = j.length; l > e; e++) {
								k = j[e];
								var m = new o["default"](this.player_, {
										track: c,
										cue: k
									});
								d.push(m),
								g.addChild(m)
							}
						return d.length > 0 && this.show(),
						this.items = d,
						g
					},
					b
				}
					(i["default"]));
				x.prototype.kind_ = "chapters",
				x.prototype.controlText_ = "Chapters",
				k["default"].registerComponent("ChaptersButton", x),
				c["default"] = x,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../menu/menu.js": 111,
				"../../utils/dom.js": 143,
				"../../utils/fn.js": 145,
				"../../utils/to-title-case.js": 152,
				"./chapters-track-menu-item.js": 88,
				"./text-track-button.js": 92,
				"./text-track-menu-item.js": 93,
				"global/window": 2
			}
		],
		88: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../menu/menu-item.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/fn.js"),
				m = d(l),
				n = function (a) {
					function b(c, d) {
						f(this, b);
						var e = d.track,
						g = d.cue,
						h = c.currentTime();
						d.label = g.text,
						d.selected = g.startTime <= h && h < g.endTime,
						a.call(this, c, d),
						this.track = e,
						this.cue = g,
						e.addEventListener("cuechange", m.bind(this, this.update))
					}
					return g(b, a),
					b.prototype.handleClick = function () {
						a.prototype.handleClick.call(this),
						this.player_.currentTime(this.cue.startTime),
						this.update(this.cue.startTime)
					},
					b.prototype.update = function () {
						var a = this.cue,
						b = this.player_.currentTime();
						this.selected(a.startTime <= b && b < a.endTime)
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("ChaptersTrackMenuItem", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../menu/menu-item.js": 110,
				"../../utils/fn.js": 145
			}
		],
		89: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./text-track-button.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/fn.js"),
				m = d(l),
				n = function (a) {
					function b(c, d, e) {
						var g = this;
						f(this, b),
						a.call(this, c, d, e),
						this.el_.setAttribute("aria-label", "Descriptions Menu");
						var h = c.textTracks();
						h && !function () {
							var a = m.bind(g, g.handleTracksChange);
							h.addEventListener("change", a),
							g.on("dispose", function () {
								h.removeEventListener("change", a)
							})
						}
						()
					}
					return g(b, a),
					b.prototype.handleTracksChange = function () {
						for (var a = this.player().textTracks(), b = !1, c = 0, d = a.length; d > c; c++) {
							var e = a[c];
							if (e.kind !== this.kind_ && "showing" === e.mode) {
								b = !0;
								break
							}
						}
						b ? this.disable() : this.enable()
					},
					b.prototype.buildCSSClass = function () {
						return "vjs-descriptions-button " + a.prototype.buildCSSClass.call(this)
					},
					b
				}
				(i["default"]);
				n.prototype.kind_ = "descriptions",
				n.prototype.controlText_ = "Descriptions",
				k["default"].registerComponent("DescriptionsButton", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/fn.js": 145,
				"./text-track-button.js": 92
			}
		],
		90: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./text-track-menu-item.js"),
				h = d(g),
				i = a("../../component.js"),
				j = d(i),
				k = function (a) {
					function b(c, d) {
						e(this, b),
						d.track = {
							kind: d.kind,
							player: c,
							label: d.kind + " off",
							"default": !1,
							mode: "disabled"
						},
						d.selectable = !0,
						a.call(this, c, d),
						this.selected(!0)
					}
					return f(b, a),
					b.prototype.handleTracksChange = function () {
						for (var a = this.player().textTracks(), b = !0, c = 0, d = a.length; d > c; c++) {
							var e = a[c];
							if (e.kind === this.track.kind && "showing" === e.mode) {
								b = !1;
								break
							}
						}
						this.selected(b)
					},
					b
				}
				(h["default"]);
				j["default"].registerComponent("OffTextTrackMenuItem", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"./text-track-menu-item.js": 93
			}
		],
		91: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./text-track-button.js"),
				h = d(g),
				i = a("../../component.js"),
				j = d(i),
				k = function (a) {
					function b(c, d, f) {
						e(this, b),
						a.call(this, c, d, f),
						this.el_.setAttribute("aria-label", "Subtitles Menu")
					}
					return f(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-subtitles-button " + a.prototype.buildCSSClass.call(this)
					},
					b
				}
				(h["default"]);
				k.prototype.kind_ = "subtitles",
				k.prototype.controlText_ = "Subtitles",
				j["default"].registerComponent("SubtitlesButton", k),
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"./text-track-button.js": 92
			}
		],
		92: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../track-button.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/fn.js"),
				m = (d(l), a("./text-track-menu-item.js")),
				n = e(m),
				o = a("./off-text-track-menu-item.js"),
				p = e(o),
				q = function (a) {
					function b(c) {
						var d = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1];
						f(this, b),
						d.tracks = c.textTracks(),
						a.call(this, c, d)
					}
					return g(b, a),
					b.prototype.createItems = function () {
						var a = arguments.length <= 0 || void 0 === arguments[0] ? [] : arguments[0];
						a.push(new p["default"](this.player_, {
								kind: this.kind_
							}));
						var b = this.player_.textTracks();
						if (!b)
							return a;
						for (var c = 0; c < b.length; c++) {
							var d = b[c];
							d.kind === this.kind_ && a.push(new n["default"](this.player_, {
									selectable: !0,
									track: d
								}))
						}
						return a
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("TextTrackButton", q),
				c["default"] = q,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/fn.js": 145,
				"../track-button.js": 98,
				"./off-text-track-menu-item.js": 90,
				"./text-track-menu-item.js": 93
			}
		],
		93: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../menu/menu-item.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/fn.js"),
				m = d(l),
				n = a("global/window"),
				o = e(n),
				p = a("global/document"),
				q = e(p),
				r = function (a) {
					function b(c, d) {
						var e = this;
						f(this, b);
						var g = d.track,
						h = c.textTracks();
						d.label = g.label || g.language || "Unknown",
						d.selected = g["default"] || "showing" === g.mode,
						a.call(this, c, d),
						this.track = g,
						h && !function () {
							var a = m.bind(e, e.handleTracksChange);
							h.addEventListener("change", a),
							e.on("dispose", function () {
								h.removeEventListener("change", a)
							})
						}
						(),
						h && void 0 === h.onchange && !function () {
							var a = void 0;
							e.on(["tap", "click"], function () {
								if ("object" != typeof o["default"].Event)
									try {
										a = new o["default"].Event("change")
									} catch (b) {}
								a || (a = q["default"].createEvent("Event"), a.initEvent("change", !0, !0)),
								h.dispatchEvent(a)
							})
						}
						()
					}
					return g(b, a),
					b.prototype.handleClick = function (b) {
						var c = this.track.kind,
						d = this.player_.textTracks();
						if (a.prototype.handleClick.call(this, b), d)
							for (var e = 0; e < d.length; e++) {
								var f = d[e];
								f.kind === c && (f.mode = f === this.track ? "showing" : "disabled")
							}
					},
					b.prototype.handleTracksChange = function () {
						this.selected("showing" === this.track.mode)
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("TextTrackMenuItem", r),
				c["default"] = r,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../menu/menu-item.js": 110,
				"../../utils/fn.js": 145,
				"global/document": 1,
				"global/window": 2
			}
		],
		94: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../component.js"),
				i = e(h),
				j = a("../../utils/dom.js"),
				k = d(j),
				l = a("../../utils/format-time.js"),
				m = e(l),
				n = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "timeupdate", this.updateContent)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var b = a.prototype.createEl.call(this, "div", {
								className: "vjs-current-time vjs-time-control vjs-control"
							});
						return this.contentEl_ = k.createEl("div", {
								className: "vjs-current-time-display",
								innerHTML: '<span class="vjs-control-text">Current Time </span>0:00'
							}, {
								"aria-live": "off"
							}),
						b.appendChild(this.contentEl_),
						b
					},
					b.prototype.updateContent = function () {
						var a = this.player_.scrubbing() ? this.player_.getCache().currentTime : this.player_.currentTime(),
						b = this.localize("Current Time"),
						c = m["default"](a, this.player_.duration());
						c !== this.formattedTime_ && (this.formattedTime_ = c, this.contentEl_.innerHTML = '<span class="vjs-control-text">' + b + "</span> " + c)
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("CurrentTimeDisplay", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/dom.js": 143,
				"../../utils/format-time.js": 146
			}
		],
		95: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../component.js"),
				i = e(h),
				j = a("../../utils/dom.js"),
				k = d(j),
				l = a("../../utils/format-time.js"),
				m = e(l),
				n = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "timeupdate", this.updateContent),
						this.on(c, "loadedmetadata", this.updateContent)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var b = a.prototype.createEl.call(this, "div", {
								className: "vjs-duration vjs-time-control vjs-control"
							});
						return this.contentEl_ = k.createEl("div", {
								className: "vjs-duration-display",
								innerHTML: '<span class="vjs-control-text">' + this.localize("Duration Time") + "</span> 0:00"
							}, {
								"aria-live": "off"
							}),
						b.appendChild(this.contentEl_),
						b
					},
					b.prototype.updateContent = function () {
						var a = this.player_.duration();
						if (a && this.duration_ !== a) {
							this.duration_ = a;
							var b = this.localize("Duration Time"),
							c = m["default"](a);
							this.contentEl_.innerHTML = '<span class="vjs-control-text">' + b + "</span> " + c
						}
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("DurationDisplay", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/dom.js": 143,
				"../../utils/format-time.js": 146
			}
		],
		96: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../component.js"),
				i = e(h),
				j = a("../../utils/dom.js"),
				k = d(j),
				l = a("../../utils/format-time.js"),
				m = e(l),
				n = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "timeupdate", this.updateContent)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var b = a.prototype.createEl.call(this, "div", {
								className: "vjs-remaining-time vjs-time-control vjs-control"
							});
						return this.contentEl_ = k.createEl("div", {
								className: "vjs-remaining-time-display",
								innerHTML: '<span class="vjs-control-text">' + this.localize("Remaining Time") + "</span> -0:00"
							}, {
								"aria-live": "off"
							}),
						b.appendChild(this.contentEl_),
						b
					},
					b.prototype.updateContent = function () {
						if (this.player_.duration()) {
							var a = this.localize("Remaining Time"),
							b = m["default"](this.player_.remainingTime());
							b !== this.formattedTime_ && (this.formattedTime_ = b, this.contentEl_.innerHTML = '<span class="vjs-control-text">' + a + "</span> -" + b)
						}
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("RemainingTimeDisplay", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../utils/dom.js": 143,
				"../../utils/format-time.js": 146
			}
		],
		97: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../../component.js"),
				h = d(g),
				i = function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-time-control vjs-time-divider",
							innerHTML: "<div><span>/</span></div>"
						})
					},
					b
				}
				(h["default"]);
				h["default"].registerComponent("TimeDivider", i),
				c["default"] = i,
				b.exports = c["default"]
			}, {
				"../../component.js": 67
			}
		],
		98: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../menu/menu-button.js"),
				i = e(h),
				j = a("../component.js"),
				k = e(j),
				l = a("../utils/fn.js"),
				m = d(l),
				n = function (a) {
					function b(c, d) {
						f(this, b);
						var e = d.tracks;
						if (a.call(this, c, d), this.items.length <= 1 && this.hide(), e) {
							var g = m.bind(this, this.update);
							e.addEventListener("removetrack", g),
							e.addEventListener("addtrack", g),
							this.player_.on("dispose", function () {
								e.removeEventListener("removetrack", g),
								e.removeEventListener("addtrack", g)
							})
						}
					}
					return g(b, a),
					b
				}
				(i["default"]);
				k["default"].registerComponent("TrackButton", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../component.js": 67,
				"../menu/menu-button.js": 109,
				"../utils/fn.js": 145
			}
		],
		99: [function (a, b, c) {
				"use strict";

				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../../slider/slider.js"),
				i = e(h),
				j = a("../../component.js"),
				k = e(j),
				l = a("../../utils/fn.js"),
				m = d(l),
				n = a("./volume-level.js"),
				o = (e(n), function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "volumechange", this.updateARIAAttributes),
						c.ready(m.bind(this, this.updateARIAAttributes))
					}
					return g(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-volume-bar vjs-slider-bar"
						}, {
							"aria-label": "volume level"
						})
					},
					b.prototype.handleMouseMove = function (a) {
						this.checkMuted(),
						this.player_.volume(this.calculateDistance(a))
					},
					b.prototype.checkMuted = function () {
						this.player_.muted() && this.player_.muted(!1)
					},
					b.prototype.getPercent = function () {
						return this.player_.muted() ? 0 : this.player_.volume()
					},
					b.prototype.stepForward = function () {
						this.checkMuted(),
						this.player_.volume(this.player_.volume() + .1)
					},
					b.prototype.stepBack = function () {
						this.checkMuted(),
						this.player_.volume(this.player_.volume() - .1)
					},
					b.prototype.updateARIAAttributes = function () {
						var a = (100 * this.player_.volume()).toFixed(2);
						this.el_.setAttribute("aria-valuenow", a),
						this.el_.setAttribute("aria-valuetext", a + "%")
					},
					b
				}
					(i["default"]));
				o.prototype.options_ = {
					children: ["volumeLevel"],
					barName: "volumeLevel"
				},
				o.prototype.playerEvent = "volumechange",
				k["default"].registerComponent("VolumeBar", o),
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"../../slider/slider.js": 119,
				"../../utils/fn.js": 145,
				"./volume-level.js": 101
			}
		],
		100: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../../component.js"),
				h = d(g),
				i = a("./volume-bar.js"),
				j = (d(i), function (a) {
					function b(c, d) {
						e(this, b),
						a.call(this, c, d),
						c.tech_ && c.tech_.featuresVolumeControl === !1 && this.addClass("vjs-hidden"),
						this.on(c, "loadstart", function () {
							c.tech_.featuresVolumeControl === !1 ? this.addClass("vjs-hidden") : this.removeClass("vjs-hidden")
						})
					}
					return f(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-volume-control vjs-control"
						})
					},
					b
				}
					(h["default"]));
				j.prototype.options_ = {
					children: ["volumeBar"]
				},
				h["default"].registerComponent("VolumeControl", j),
				c["default"] = j,
				b.exports = c["default"]
			}, {
				"../../component.js": 67,
				"./volume-bar.js": 99
			}
		],
		101: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../../component.js"),
				h = d(g),
				i = function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-volume-level",
							innerHTML: '<span class="vjs-control-text"></span>'
						})
					},
					b
				}
				(h["default"]);
				h["default"].registerComponent("VolumeLevel", i),
				c["default"] = i,
				b.exports = c["default"]
			}, {
				"../../component.js": 67
			}
		],
		102: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../utils/fn.js"),
				i = e(h),
				j = a("../component.js"),
				k = d(j),
				l = a("../popup/popup.js"),
				m = d(l),
				n = a("../popup/popup-button.js"),
				o = d(n),
				p = a("./mute-toggle.js"),
				q = d(p),
				r = a("./volume-control/volume-bar.js"),
				s = d(r),
				t = function (a) {
					function b(c) {
						function d() {
							c.tech_ && c.tech_.featuresVolumeControl === !1 ? this.addClass("vjs-hidden") : this.removeClass("vjs-hidden")
						}
						var e = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1];
						f(this, b),
						void 0 === e.inline && (e.inline = !0),
						void 0 === e.vertical && (e.vertical = e.inline ? !1 : !0),
						e.volumeBar = e.volumeBar || {},
						e.volumeBar.vertical = !!e.vertical,
						a.call(this, c, e),
						this.on(c, "volumechange", this.volumeUpdate),
						this.on(c, "loadstart", this.volumeUpdate),
						d.call(this),
						this.on(c, "loadstart", d),
						this.on(this.volumeBar, ["slideractive", "focus"], function () {
							this.addClass("vjs-slider-active")
						}),
						this.on(this.volumeBar, ["sliderinactive", "blur"], function () {
							this.removeClass("vjs-slider-active")
						}),
						this.on(this.volumeBar, ["focus"], function () {
							this.addClass("vjs-lock-showing")
						}),
						this.on(this.volumeBar, ["blur"], function () {
							this.removeClass("vjs-lock-showing")
						})
					}
					return g(b, a),
					b.prototype.buildCSSClass = function () {
						var b = "";
						return b = this.options_.vertical ? "vjs-volume-menu-button-vertical" : "vjs-volume-menu-button-horizontal",
						"vjs-volume-menu-button " + a.prototype.buildCSSClass.call(this) + " " + b
					},
					b.prototype.createPopup = function () {
						var a = new m["default"](this.player_, {
								contentElType: "div"
							}),
						b = new s["default"](this.player_, this.options_.volumeBar);
						return a.addChild(b),
						this.menuContent = a,
						this.volumeBar = b,
						this.attachVolumeBarEvents(),
						a
					},
					b.prototype.handleClick = function () {
						q["default"].prototype.handleClick.call(this),
						a.prototype.handleClick.call(this)
					},
					b.prototype.attachVolumeBarEvents = function () {
						this.menuContent.on(["mousedown", "touchdown"], i.bind(this, this.handleMouseDown))
					},
					b.prototype.handleMouseDown = function () {
						this.on(["mousemove", "touchmove"], i.bind(this.volumeBar, this.volumeBar.handleMouseMove)),
						this.on(this.el_.ownerDocument, ["mouseup", "touchend"], this.handleMouseUp)
					},
					b.prototype.handleMouseUp = function () {
						this.off(["mousemove", "touchmove"], i.bind(this.volumeBar, this.volumeBar.handleMouseMove))
					},
					b
				}
				(o["default"]);
				t.prototype.volumeUpdate = q["default"].prototype.update,
				t.prototype.controlText_ = "Mute",
				k["default"].registerComponent("VolumeMenuButton", t),
				c["default"] = t,
				b.exports = c["default"]
			}, {
				"../component.js": 67,
				"../popup/popup-button.js": 115,
				"../popup/popup.js": 116,
				"../utils/fn.js": 145,
				"./mute-toggle.js": 73,
				"./volume-control/volume-bar.js": 99
			}
		],
		103: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./component"),
				i = e(h),
				j = a("./modal-dialog"),
				k = e(j),
				l = a("./utils/dom"),
				m = (d(l), a("./utils/merge-options")),
				n = e(m),
				o = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.on(c, "error", this.open)
					}
					return g(b, a),
					b.prototype.buildCSSClass = function () {
						return "vjs-error-display " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.content = function () {
						var a = this.player().error();
						return a ? this.localize(a.message) : ""
					},
					b
				}
				(k["default"]);
				o.prototype.options_ = n["default"](k["default"].prototype.options_, {
						fillAlways: !0,
						temporary: !1,
						uncloseable: !0
					}),
				i["default"].registerComponent("ErrorDisplay", o),
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"./component": 67,
				"./modal-dialog": 112,
				"./utils/dom": 143,
				"./utils/merge-options": 149
			}
		],
		104: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				c.__esModule = !0;
				var e = a("./utils/events.js"),
				f = d(e),
				g = function () {};
				g.prototype.allowedEvents_ = {},
				g.prototype.on = function (a, b) {
					var c = this.addEventListener;
					this.addEventListener = function () {},
					f.on(this, a, b),
					this.addEventListener = c
				},
				g.prototype.addEventListener = g.prototype.on,
				g.prototype.off = function (a, b) {
					f.off(this, a, b)
				},
				g.prototype.removeEventListener = g.prototype.off,
				g.prototype.one = function (a, b) {
					var c = this.addEventListener;
					this.addEventListener = function () {},
					f.one(this, a, b),
					this.addEventListener = c
				},
				g.prototype.trigger = function (a) {
					var b = a.type || a;
					"string" == typeof a && (a = {
							type: b
						}),
					a = f.fixEvent(a),
					this.allowedEvents_[b] && this["on" + b] && this["on" + b](a),
					f.trigger(this, a)
				},
				g.prototype.dispatchEvent = g.prototype.trigger,
				c["default"] = g,
				b.exports = c["default"]
			}, {
				"./utils/events.js": 144
			}
		],
		105: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				var e = a("./utils/log"),
				f = d(e),
				g = function (a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (a.super_ = b)
				},
				h = function (a) {
					var b = arguments.length <= 1 || void 0 === arguments[1] ? {}
					 : arguments[1],
					c = function () {
						a.apply(this, arguments)
					},
					d = {};
					"object" == typeof b ? ("function" == typeof b.init && (f["default"].warn("Constructor logic via init() is deprecated; please use constructor() instead."), b.constructor = b.init), b.constructor !== Object.prototype.constructor && (c = b.constructor), d = b) : "function" == typeof b && (c = b),
					g(c, a);
					for (var e in d)
						d.hasOwnProperty(e) && (c.prototype[e] = d[e]);
					return c
				};
				c["default"] = h,
				b.exports = c["default"]
			}, {
				"./utils/log": 148
			}
		],
		106: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				for (var e = a("global/document"), f = d(e), g = {}, h = [["requestFullscreen", "exitFullscreen", "fullscreenElement", "fullscreenEnabled", "fullscreenchange", "fullscreenerror"], ["webkitRequestFullscreen", "webkitExitFullscreen", "webkitFullscreenElement", "webkitFullscreenEnabled", "webkitfullscreenchange", "webkitfullscreenerror"], ["webkitRequestFullScreen", "webkitCancelFullScreen", "webkitCurrentFullScreenElement", "webkitCancelFullScreen", "webkitfullscreenchange", "webkitfullscreenerror"], ["mozRequestFullScreen", "mozCancelFullScreen", "mozFullScreenElement", "mozFullScreenEnabled", "mozfullscreenchange", "mozfullscreenerror"], ["msRequestFullscreen", "msExitFullscreen", "msFullscreenElement", "msFullscreenEnabled", "MSFullscreenChange", "MSFullscreenError"]], i = h[0], j = void 0, k = 0; k < h.length; k++)
					if (h[k][1]in f["default"]) {
						j = h[k];
						break
					}
				if (j)
					for (var k = 0; k < j.length; k++)
						g[i[k]] = j[k];
				c["default"] = g,
				b.exports = c["default"]
			}, {
				"global/document": 1
			}
		],
		107: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("./component"),
				h = d(g),
				i = function (a) {
					function b() {
						e(this, b),
						a.apply(this, arguments)
					}
					return f(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-loading-spinner",
							dir: "ltr"
						})
					},
					b
				}
				(h["default"]);
				h["default"].registerComponent("LoadingSpinner", i),
				c["default"] = i,
				b.exports = c["default"]
			}, {
				"./component": 67
			}
		],
		108: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				var e = a("object.assign"),
				f = d(e),
				g = function i(a) {
					"number" == typeof a ? this.code = a : "string" == typeof a ? this.message = a : "object" == typeof a && f["default"](this, a),
					this.message || (this.message = i.defaultMessages[this.code] || "")
				};
				g.prototype.code = 0,
				g.prototype.message = "",
				g.prototype.status = null,
				g.errorTypes = ["MEDIA_ERR_CUSTOM", "MEDIA_ERR_ABORTED", "MEDIA_ERR_NETWORK", "MEDIA_ERR_DECODE", "MEDIA_ERR_SRC_NOT_SUPPORTED", "MEDIA_ERR_ENCRYPTED"],
				g.defaultMessages = {
					1: "You aborted the media playback",
					2: "A network error caused the media download to fail part-way.",
					3: "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.",
					4: "The media could not be loaded, either because the server or network failed or because the format is not supported.",
					5: "The media is encrypted and we do not have the keys to decrypt it."
				};
				for (var h = 0; h < g.errorTypes.length; h++)
					g[g.errorTypes[h]] = h, g.prototype[g.errorTypes[h]] = h;
				c["default"] = g,
				b.exports = c["default"]
			}, {
				"object.assign": 45
			}
		],
		109: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../clickable-component.js"),
				i = e(h),
				j = a("../component.js"),
				k = e(j),
				l = a("./menu.js"),
				m = e(l),
				n = a("../utils/dom.js"),
				o = d(n),
				p = a("../utils/fn.js"),
				q = d(p),
				r = a("../utils/to-title-case.js"),
				s = e(r),
				t = function (a) {
					function b(c) {
						var d = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1];
						f(this, b),
						a.call(this, c, d),
						this.update(),
						this.enabled_ = !0,
						this.el_.setAttribute("aria-haspopup", "true"),
						this.el_.setAttribute("role", "menuitem"),
						this.on("keydown", this.handleSubmenuKeyPress)
					}
					return g(b, a),
					b.prototype.update = function () {
						var a = this.createMenu();
						this.menu && this.removeChild(this.menu),
						this.menu = a,
						this.addChild(a),
						this.buttonPressed_ = !1,
						this.el_.setAttribute("aria-expanded", "false"),
						this.items && 0 === this.items.length ? this.hide() : this.items && this.items.length > 1 && this.show()
					},
					b.prototype.createMenu = function () {
						var a = new m["default"](this.player_);
						if (this.options_.title) {
							var b = o.createEl("li", {
									className: "vjs-menu-title",
									innerHTML: s["default"](this.options_.title),
									tabIndex: -1
								});
							a.children_.unshift(b),
							o.insertElFirst(b, a.contentEl())
						}
						if (this.items = this.createItems(), this.items)
							for (var c = 0; c < this.items.length; c++)
								a.addItem(this.items[c]);
						return a
					},
					b.prototype.createItems = function () {},
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: this.buildCSSClass()
						})
					},
					b.prototype.buildCSSClass = function () {
						var b = "vjs-menu-button";
						return b += this.options_.inline === !0 ? "-inline" : "-popup",
						"vjs-menu-button " + b + " " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.handleClick = function () {
						this.one("mouseout", q.bind(this, function () {
								this.menu.unlockShowing(),
								this.el_.blur()
							})),
						this.buttonPressed_ ? this.unpressButton() : this.pressButton()
					},
					b.prototype.handleKeyPress = function (b) {
						27 === b.which || 9 === b.which ? (this.buttonPressed_ && this.unpressButton(), 9 !== b.which && b.preventDefault()) : 38 === b.which || 40 === b.which ? this.buttonPressed_ || (this.pressButton(), b.preventDefault()) : a.prototype.handleKeyPress.call(this, b)
					},
					b.prototype.handleSubmenuKeyPress = function (a) {
						(27 === a.which || 9 === a.which) && (this.buttonPressed_ && this.unpressButton(), 9 !== a.which && a.preventDefault())
					},
					b.prototype.pressButton = function () {
						this.enabled_ && (this.buttonPressed_ = !0, this.menu.lockShowing(), this.el_.setAttribute("aria-expanded", "true"), this.menu.focus())
					},
					b.prototype.unpressButton = function () {
						this.enabled_ && (this.buttonPressed_ = !1, this.menu.unlockShowing(), this.el_.setAttribute("aria-expanded", "false"), this.el_.focus())
					},
					b.prototype.disable = function () {
						return this.buttonPressed_ = !1,
						this.menu.unlockShowing(),
						this.el_.setAttribute("aria-expanded", "false"),
						this.enabled_ = !1,
						a.prototype.disable.call(this)
					},
					b.prototype.enable = function () {
						return this.enabled_ = !0,
						a.prototype.enable.call(this)
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("MenuButton", t),
				c["default"] = t,
				b.exports = c["default"]
			}, {
				"../clickable-component.js": 65,
				"../component.js": 67,
				"../utils/dom.js": 143,
				"../utils/fn.js": 145,
				"../utils/to-title-case.js": 152,
				"./menu.js": 111
			}
		],
		110: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../clickable-component.js"),
				h = d(g),
				i = a("../component.js"),
				j = d(i),
				k = a("object.assign"),
				l = d(k),
				m = function (a) {
					function b(c, d) {
						e(this, b),
						a.call(this, c, d),
						this.selectable = d.selectable,
						this.selected(d.selected),
						this.selectable ? this.el_.setAttribute("role", "menuitemcheckbox") : this.el_.setAttribute("role", "menuitem")
					}
					return f(b, a),
					b.prototype.createEl = function (b, c, d) {
						return a.prototype.createEl.call(this, "li", l["default"]({
								className: "vjs-menu-item",
								innerHTML: this.localize(this.options_.label),
								tabIndex: -1
							}, c), d)
					},
					b.prototype.handleClick = function () {
						this.selected(!0)
					},
					b.prototype.selected = function (a) {
						this.selectable && (a ? (this.addClass("vjs-selected"), this.el_.setAttribute("aria-checked", "true"), this.controlText(", selected")) : (this.removeClass("vjs-selected"), this.el_.setAttribute("aria-checked", "false"), this.controlText(" ")))
					},
					b
				}
				(h["default"]);
				j["default"].registerComponent("MenuItem", m),
				c["default"] = m,
				b.exports = c["default"]
			}, {
				"../clickable-component.js": 65,
				"../component.js": 67,
				"object.assign": 45
			}
		],
		111: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../component.js"),
				i = e(h),
				j = a("../utils/dom.js"),
				k = d(j),
				l = a("../utils/fn.js"),
				m = d(l),
				n = a("../utils/events.js"),
				o = d(n),
				p = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.focusedChild_ = -1,
						this.on("keydown", this.handleKeyPress)
					}
					return g(b, a),
					b.prototype.addItem = function (a) {
						this.addChild(a),
						a.on("click", m.bind(this, function () {
								this.unlockShowing()
							}))
					},
					b.prototype.createEl = function () {
						var b = this.options_.contentElType || "ul";
						this.contentEl_ = k.createEl(b, {
								className: "vjs-menu-content"
							}),
						this.contentEl_.setAttribute("role", "menu");
						var c = a.prototype.createEl.call(this, "div", {
								append: this.contentEl_,
								className: "vjs-menu"
							});
						return c.setAttribute("role", "presentation"),
						c.appendChild(this.contentEl_),
						o.on(c, "click", function (a) {
							a.preventDefault(),
							a.stopImmediatePropagation()
						}),
						c
					},
					b.prototype.handleKeyPress = function (a) {
						37 === a.which || 40 === a.which ? (a.preventDefault(), this.stepForward()) : (38 === a.which || 39 === a.which) && (a.preventDefault(), this.stepBack())
					},
					b.prototype.stepForward = function () {
						var a = 0;
						void 0 !== this.focusedChild_ && (a = this.focusedChild_ + 1),
						this.focus(a)
					},
					b.prototype.stepBack = function () {
						var a = 0;
						void 0 !== this.focusedChild_ && (a = this.focusedChild_ - 1),
						this.focus(a)
					},
					b.prototype.focus = function () {
						var a = arguments.length <= 0 || void 0 === arguments[0] ? 0 : arguments[0],
						b = this.children().slice(),
						c = b.length && b[0].className && /vjs-menu-title/.test(b[0].className);
						c && b.shift(),
						b.length > 0 && (0 > a ? a = 0 : a >= b.length && (a = b.length - 1), this.focusedChild_ = a, b[a].el_.focus())
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("Menu", p),
				c["default"] = p,
				b.exports = c["default"]
			}, {
				"../component.js": 67,
				"../utils/dom.js": 143,
				"../utils/events.js": 144,
				"../utils/fn.js": 145
			}
		],
		112: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./utils/dom"),
				i = e(h),
				j = a("./utils/fn"),
				k = e(j),
				l = a("./utils/log"),
				m = (d(l), a("./component")),
				n = d(m),
				o = a("./close-button"),
				p = (d(o), "vjs-modal-dialog"),
				q = 27,
				r = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.opened_ = this.hasBeenOpened_ = this.hasBeenFilled_ = !1,
						this.closeable(!this.options_.uncloseable),
						this.content(this.options_.content),
						this.contentEl_ = i.createEl("div", {
								className: p + "-content"
							}, {
								role: "document"
							}),
						this.descEl_ = i.createEl("p", {
								className: p + "-description vjs-offscreen",
								id: this.el().getAttribute("aria-describedby")
							}),
						i.textContent(this.descEl_, this.description()),
						this.el_.appendChild(this.descEl_),
						this.el_.appendChild(this.contentEl_)
					}
					return g(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: this.buildCSSClass(),
							tabIndex: -1
						}, {
							"aria-describedby": this.id() + "_description",
							"aria-hidden": "true",
							"aria-label": this.label(),
							role: "dialog"
						})
					},
					b.prototype.buildCSSClass = function () {
						return p + " vjs-hidden " + a.prototype.buildCSSClass.call(this)
					},
					b.prototype.handleKeyPress = function (a) {
						a.which === q && this.closeable() && this.close()
					},
					b.prototype.label = function () {
						return this.options_.label || this.localize("Modal Window")
					},
					b.prototype.description = function () {
						var a = this.options_.description || this.localize("This is a modal window.");
						return this.closeable() && (a += " " + this.localize("This modal can be closed by pressing the Escape key or activating the close button.")),
						a
					},
					b.prototype.open = function () {
						if (!this.opened_) {
							var a = this.player();
							this.trigger("beforemodalopen"),
							this.opened_ = !0,
							(this.options_.fillAlways || !this.hasBeenOpened_ && !this.hasBeenFilled_) && this.fill(),
							this.wasPlaying_ = !a.paused(),
							this.wasPlaying_ && a.pause(),
							this.closeable() && this.on(this.el_.ownerDocument, "keydown", k.bind(this, this.handleKeyPress)),
							a.controls(!1),
							this.show(),
							this.el().setAttribute("aria-hidden", "false"),
							this.trigger("modalopen"),
							this.hasBeenOpened_ = !0
						}
						return this
					},
					b.prototype.opened = function (a) {
						return "boolean" == typeof a && this[a ? "open" : "close"](),
						this.opened_
					},
					b.prototype.close = function () {
						if (this.opened_) {
							var a = this.player();
							this.trigger("beforemodalclose"),
							this.opened_ = !1,
							this.wasPlaying_ && a.play(),
							this.closeable() && this.off(this.el_.ownerDocument, "keydown", k.bind(this, this.handleKeyPress)),
							a.controls(!0),
							this.hide(),
							this.el().setAttribute("aria-hidden", "true"),
							this.trigger("modalclose"),
							this.options_.temporary && this.dispose()
						}
						return this
					},
					b.prototype.closeable = function c(a) {
						if ("boolean" == typeof a) {
							var c = this.closeable_ = !!a,
							b = this.getChild("closeButton");
							if (c && !b) {
								var d = this.contentEl_;
								this.contentEl_ = this.el_,
								b = this.addChild("closeButton"),
								this.contentEl_ = d,
								this.on(b, "close", this.close)
							}
							!c && b && (this.off(b, "close", this.close), this.removeChild(b), b.dispose())
						}
						return this.closeable_
					},
					b.prototype.fill = function () {
						return this.fillWith(this.content())
					},
					b.prototype.fillWith = function (a) {
						var b = this.contentEl(),
						c = b.parentNode,
						d = b.nextSibling;
						return this.trigger("beforemodalfill"),
						this.hasBeenFilled_ = !0,
						c.removeChild(b),
						this.empty(),
						i.insertContent(b, a),
						this.trigger("modalfill"),
						d ? c.insertBefore(b, d) : c.appendChild(b),
						this
					},
					b.prototype.empty = function () {
						return this.trigger("beforemodalempty"),
						i.emptyEl(this.contentEl()),
						this.trigger("modalempty"),
						this
					},
					b.prototype.content = function (a) {
						return "undefined" != typeof a && (this.content_ = a),
						this.content_
					},
					b
				}
				(n["default"]);
				r.prototype.options_ = {
					temporary: !0
				},
				n["default"].registerComponent("ModalDialog", r),
				c["default"] = r,
				b.exports = c["default"]
			}, {
				"./close-button": 66,
				"./component": 67,
				"./utils/dom": 143,
				"./utils/fn": 145,
				"./utils/log": 148
			}
		],
		113: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./component.js"),
				i = e(h),
				j = a("global/document"),
				k = e(j),
				l = a("global/window"),
				m = e(l),
				n = a("./utils/events.js"),
				o = d(n),
				p = a("./utils/dom.js"),
				q = d(p),
				r = a("./utils/fn.js"),
				s = d(r),
				t = a("./utils/guid.js"),
				u = d(t),
				v = a("./utils/browser.js"),
				w = d(v),
				x = a("./utils/log.js"),
				y = e(x),
				z = a("./utils/to-title-case.js"),
				A = e(z),
				B = a("./utils/time-ranges.js"),
				C = a("./utils/buffer.js"),
				D = a("./utils/stylesheet.js"),
				E = d(D),
				F = a("./fullscreen-api.js"),
				G = e(F),
				H = a("./media-error.js"),
				I = e(H),
				J = a("safe-json-parse/tuple"),
				K = e(J),
				L = a("object.assign"),
				M = e(L),
				N = a("./utils/merge-options.js"),
				O = e(N),
				P = a("./tracks/text-track-list-converter.js"),
				Q = e(P),
				R = a("./tracks/audio-track-list.js"),
				S = e(R),
				T = a("./tracks/video-track-list.js"),
				U = e(T),
				V = a("./tech/loader.js"),
				W = (e(V), a("./poster-image.js")),
				X = (e(W), a("./tracks/text-track-display.js")),
				Y = (e(X), a("./loading-spinner.js")),
				Z = (e(Y), a("./big-play-button.js")),
				$ = (e(Z), a("./control-bar/control-bar.js")),
				_ = (e($), a("./error-display.js")),
				aa = (e(_), a("./tracks/text-track-settings.js")),
				ba = (e(aa), a("./modal-dialog")),
				ca = e(ba),
				da = a("./tech/tech.js"),
				ea = e(da),
				fa = a("./tech/html5.js"),
				ga = (e(fa), function (a) {
					function b(c, d, e) {
						var g = this;
						if (f(this, b), c.id = c.id || "vjs_video_" + u.newGUID(), d = M["default"](b.getTagSettings(c), d), d.initChildren = !1, d.createEl = !1, d.reportTouchActivity = !1, a.call(this, null, d, e), !this.options_ || !this.options_.techOrder || !this.options_.techOrder.length)
							throw new Error("No techOrder specified. Did you overwrite videojs.options instead of just changing the properties you want to override?");
						this.tag = c,
						this.tagAttributes = c && q.getElAttributes(c),
						this.language(this.options_.language),
						d.languages ? !function () {
							var a = {};
							Object.getOwnPropertyNames(d.languages).forEach(function (b) {
								a[b.toLowerCase()] = d.languages[b]
							}),
							g.languages_ = a
						}
						() : this.languages_ = b.prototype.options_.languages,
						this.cache_ = {},
						this.poster_ = d.poster || "",
						this.controls_ = !!d.controls,
						c.controls = !1,
						this.scrubbing_ = !1,
						this.el_ = this.createEl();
						var h = O["default"](this.options_);
						d.plugins && !function () {
							var a = d.plugins;
							Object.getOwnPropertyNames(a).forEach(function (b) {
								"function" == typeof this[b] ? this[b](a[b]) : y["default"].error("Unable to find plugin:", b)
							}, g)
						}
						(),
						this.options_.playerOptions = h,
						this.initChildren(),
						this.isAudio("audio" === c.nodeName.toLowerCase()),
						this.addClass(this.controls() ? "vjs-controls-enabled" : "vjs-controls-disabled"),
						this.el_.setAttribute("role", "region"),
						this.isAudio() ? this.el_.setAttribute("aria-label", "audio player") : this.el_.setAttribute("aria-label", "video player"),
						this.isAudio() && this.addClass("vjs-audio"),
						this.flexNotSupported_() && this.addClass("vjs-no-flex"),
						w.IS_IOS || this.addClass("vjs-workinghover"),
						b.players[this.id_] = this,
						this.userActive(!0),
						this.reportUserActivity(),
						this.listenForUserActivity_(),
						this.on("fullscreenchange", this.handleFullscreenChange_),
						this.on("stageclick", this.handleStageClick_)
					}
					return g(b, a),
					b.prototype.dispose = function () {
						this.trigger("dispose"),
						this.off("dispose"),
						this.styleEl_ && this.styleEl_.parentNode && this.styleEl_.parentNode.removeChild(this.styleEl_),
						b.players[this.id_] = null,
						this.tag && this.tag.player && (this.tag.player = null),
						this.el_ && this.el_.player && (this.el_.player = null),
						this.tech_ && this.tech_.dispose(),
						a.prototype.dispose.call(this)
					},
					b.prototype.createEl = function () {
						var b = this.el_ = a.prototype.createEl.call(this, "div"),
						c = this.tag;
						c.removeAttribute("width"),
						c.removeAttribute("height");
						var d = q.getElAttributes(c);
						if (Object.getOwnPropertyNames(d).forEach(function (a) {
								"class" === a ? b.className = d[a] : b.setAttribute(a, d[a])
							}), c.playerId = c.id, c.id += "_html5_api", c.className = "vjs-tech", c.player = b.player = this, this.addClass("vjs-paused"), m["default"].VIDEOJS_NO_DYNAMIC_STYLE !== !0) {
							this.styleEl_ = E.createStyleElement("vjs-styles-dimensions");
							var e = q.$(".vjs-styles-defaults"),
							f = q.$("head");
							f.insertBefore(this.styleEl_, e ? e.nextSibling : f.firstChild)
						}
						this.width(this.options_.width),
						this.height(this.options_.height),
						this.fluid(this.options_.fluid),
						this.aspectRatio(this.options_.aspectRatio);
						for (var g = c.getElementsByTagName("a"), h = 0; h < g.length; h++) {
							var i = g.item(h);
							q.addElClass(i, "vjs-hidden"),
							i.setAttribute("hidden", "hidden")
						}
						return c.initNetworkState_ = c.networkState,
						c.parentNode && c.parentNode.insertBefore(b, c),
						q.insertElFirst(c, b),
						this.children_.unshift(c),
						this.el_ = b,
						b
					},
					b.prototype.width = function (a) {
						return this.dimension("width", a)
					},
					b.prototype.height = function (a) {
						return this.dimension("height", a)
					},
					b.prototype.dimension = function (a, b) {
						var c = a + "_";
						if (void 0 === b)
							return this[c] || 0;
						if ("" === b)
							this[c] = void 0;
						else {
							var d = parseFloat(b);
							if (isNaN(d))
								return y["default"].error('Improper value "' + b + '" supplied for for ' + a), this;
							this[c] = d
						}
						return this.updateStyleEl_(),
						this
					},
					b.prototype.fluid = function (a) {
						return void 0 === a ? !!this.fluid_ : (this.fluid_ = !!a, void(a ? this.addClass("vjs-fluid") : this.removeClass("vjs-fluid")))
					},
					b.prototype.aspectRatio = function (a) {
						if (void 0 === a)
							return this.aspectRatio_;
						if (!/^\d+\:\d+$/.test(a))
							throw new Error("Improper value supplied for aspect ratio. The format should be width:height, for example 16:9.");
						this.aspectRatio_ = a,
						this.fluid(!0),
						this.updateStyleEl_()
					},
					b.prototype.updateStyleEl_ = function () {
						if (m["default"].VIDEOJS_NO_DYNAMIC_STYLE === !0) {
							var a = "number" == typeof this.width_ ? this.width_ : this.options_.width,
							b = "number" == typeof this.height_ ? this.height_ : this.options_.height,
							c = this.tech_ && this.tech_.el();
							return void(c && (a >= 0 && (c.width = a), b >= 0 && (c.height = b)))
						}
						var d = void 0,
						e = void 0,
						f = void 0,
						g = void 0;
						f = void 0 !== this.aspectRatio_ && "auto" !== this.aspectRatio_ ? this.aspectRatio_ : this.videoWidth() ? this.videoWidth() + ":" + this.videoHeight() : "16:9";
						var h = f.split(":"),
						i = h[1] / h[0];
						d = void 0 !== this.width_ ? this.width_ : void 0 !== this.height_ ? this.height_ / i : this.videoWidth() || 300,
						e = void 0 !== this.height_ ? this.height_ : d * i,
						g = /^[^a-zA-Z]/.test(this.id()) ? "dimensions-" + this.id() : this.id() + "-dimensions",
						this.addClass(g),
						E.setTextContent(this.styleEl_, "\n      ." + g + " {\n        width: " + d + "px;\n        height: " + e + "px;\n      }\n\n      ." + g + ".vjs-fluid {\n        padding-top: " + 100 * i + "%;\n      }\n    ")
					},
					b.prototype.loadTech_ = function (a, b) {
						this.tech_ && this.unloadTech_(),
						"Html5" !== a && this.tag && (ea["default"].getTech("Html5").disposeMediaElement(this.tag),
							this.tag.player = null, this.tag = null),
						this.techName_ = a,
						this.isReady_ = !1;
						var c = M["default"]({
								nativeControlsForTouch: this.options_.nativeControlsForTouch,
								source: b,
								playerId: this.id(),
								techId: this.id() + "_" + a + "_api",
								videoTracks: this.videoTracks_,
								textTracks: this.textTracks_,
								audioTracks: this.audioTracks_,
								autoplay: this.options_.autoplay,
								preload: this.options_.preload,
								loop: this.options_.loop,
								muted: this.options_.muted,
								poster: this.poster(),
								language: this.language(),
								"vtt.js": this.options_["vtt.js"]
							}, this.options_[a.toLowerCase()]);
						this.tag && (c.tag = this.tag),
						b && (this.currentType_ = b.type, b.src === this.cache_.src && this.cache_.currentTime > 0 && (c.startTime = this.cache_.currentTime), this.cache_.src = b.src);
						var d = ea["default"].getTech(a);
						d || (d = i["default"].getComponent(a)),
						this.tech_ = new d(c),
						this.tech_.ready(s.bind(this, this.handleTechReady_), !0),
						Q["default"].jsonToTextTracks(this.textTracksJson_ || [], this.tech_),
						this.on(this.tech_, "loadstart", this.handleTechLoadStart_),
						this.on(this.tech_, "waiting", this.handleTechWaiting_),
						this.on(this.tech_, "canplay", this.handleTechCanPlay_),
						this.on(this.tech_, "canplaythrough", this.handleTechCanPlayThrough_),
						this.on(this.tech_, "playing", this.handleTechPlaying_),
						this.on(this.tech_, "ended", this.handleTechEnded_),
						this.on(this.tech_, "seeking", this.handleTechSeeking_),
						this.on(this.tech_, "seeked", this.handleTechSeeked_),
						this.on(this.tech_, "play", this.handleTechPlay_),
						this.on(this.tech_, "firstplay", this.handleTechFirstPlay_),
						this.on(this.tech_, "pause", this.handleTechPause_),
						this.on(this.tech_, "progress", this.handleTechProgress_),
						this.on(this.tech_, "durationchange", this.handleTechDurationChange_),
						this.on(this.tech_, "fullscreenchange", this.handleTechFullscreenChange_),
						this.on(this.tech_, "error", this.handleTechError_),
						this.on(this.tech_, "suspend", this.handleTechSuspend_),
						this.on(this.tech_, "abort", this.handleTechAbort_),
						this.on(this.tech_, "emptied", this.handleTechEmptied_),
						this.on(this.tech_, "stalled", this.handleTechStalled_),
						this.on(this.tech_, "loadedmetadata", this.handleTechLoadedMetaData_),
						this.on(this.tech_, "loadeddata", this.handleTechLoadedData_),
						this.on(this.tech_, "timeupdate", this.handleTechTimeUpdate_),
						this.on(this.tech_, "ratechange", this.handleTechRateChange_),
						this.on(this.tech_, "volumechange", this.handleTechVolumeChange_),
						this.on(this.tech_, "texttrackchange", this.handleTechTextTrackChange_),
						this.on(this.tech_, "loadedmetadata", this.updateStyleEl_),
						this.on(this.tech_, "posterchange", this.handleTechPosterChange_),
						this.usingNativeControls(this.techGet_("controls")),
						this.controls() && !this.usingNativeControls() && this.addTechControlsListeners_(),
						this.tech_.el().parentNode === this.el() || "Html5" === a && this.tag || q.insertElFirst(this.tech_.el(), this.el()),
						this.tag && (this.tag.player = null, this.tag = null)
					},
					b.prototype.unloadTech_ = function () {
						this.videoTracks_ = this.videoTracks(),
						this.textTracks_ = this.textTracks(),
						this.audioTracks_ = this.audioTracks(),
						this.textTracksJson_ = Q["default"].textTracksToJson(this.tech_),
						this.isReady_ = !1,
						this.tech_.dispose(),
						this.tech_ = !1
					},
					b.prototype.tech = function (a) {
						if (a && a.IWillNotUseThisInPlugins)
							return this.tech_;
						var b = "\n      Please make sure that you are not using this inside of a plugin.\n      To disable this alert and error, please pass in an object with\n      `IWillNotUseThisInPlugins` to the `tech` method. See\n      https://github.com/videojs/video.js/issues/2617 for more info.\n    ";
						throw m["default"].alert(b),
						new Error(b)
					},
					b.prototype.addTechControlsListeners_ = function () {
						this.removeTechControlsListeners_(),
						this.on(this.tech_, "mousedown", this.handleTechClick_),
						this.on(this.tech_, "touchstart", this.handleTechTouchStart_),
						this.on(this.tech_, "touchmove", this.handleTechTouchMove_),
						this.on(this.tech_, "touchend", this.handleTechTouchEnd_),
						this.on(this.tech_, "tap", this.handleTechTap_)
					},
					b.prototype.removeTechControlsListeners_ = function () {
						this.off(this.tech_, "tap", this.handleTechTap_),
						this.off(this.tech_, "touchstart", this.handleTechTouchStart_),
						this.off(this.tech_, "touchmove", this.handleTechTouchMove_),
						this.off(this.tech_, "touchend", this.handleTechTouchEnd_),
						this.off(this.tech_, "mousedown", this.handleTechClick_)
					},
					b.prototype.handleTechReady_ = function () {
						if (this.triggerReady(), this.cache_.volume && this.techCall_("setVolume", this.cache_.volume), this.handleTechPosterChange_(), this.handleTechDurationChange_(), this.src() && this.tag && this.options_.autoplay && this.paused()) {
							try {
								delete this.tag.poster
							} catch (a) {
								y["default"]("deleting tag.poster throws in some browsers", a)
							}
							this.play()
						}
					},
					b.prototype.handleTechLoadStart_ = function () {
						this.removeClass("vjs-ended"),
						this.error(null),
						this.paused() ? (this.hasStarted(!1), this.trigger("loadstart")) : (this.trigger("loadstart"), this.trigger("firstplay"))
					},
					b.prototype.hasStarted = function (a) {
						return void 0 !== a ? (this.hasStarted_ !== a && (this.hasStarted_ = a, a ? (this.addClass("vjs-has-started"), this.trigger("firstplay")) : this.removeClass("vjs-has-started")), this) : !!this.hasStarted_
					},
					b.prototype.handleTechPlay_ = function () {
						this.removeClass("vjs-ended"),
						this.removeClass("vjs-paused"),
						this.addClass("vjs-playing"),
						this.hasStarted(!0),
						this.trigger("play")
					},
					b.prototype.handleTechWaiting_ = function () {
						var a = this;
						this.addClass("vjs-waiting"),
						this.trigger("waiting"),
						this.one("timeupdate", function () {
							return a.removeClass("vjs-waiting")
						})
					},
					b.prototype.handleTechCanPlay_ = function () {
						this.removeClass("vjs-waiting"),
						this.trigger("canplay")
					},
					b.prototype.handleTechCanPlayThrough_ = function () {
						this.removeClass("vjs-waiting"),
						this.trigger("canplaythrough")
					},
					b.prototype.handleTechPlaying_ = function () {
						this.removeClass("vjs-waiting"),
						this.trigger("playing")
					},
					b.prototype.handleTechSeeking_ = function () {
						this.addClass("vjs-seeking"),
						this.trigger("seeking")
					},
					b.prototype.handleTechSeeked_ = function () {
						this.removeClass("vjs-seeking"),
						this.trigger("seeked")
					},
					b.prototype.handleTechFirstPlay_ = function () {
						this.options_.starttime && this.currentTime(this.options_.starttime),
						this.addClass("vjs-has-started"),
						this.trigger("firstplay")
					},
					b.prototype.handleTechPause_ = function () {
						this.removeClass("vjs-playing"),
						this.addClass("vjs-paused"),
						this.trigger("pause")
					},
					b.prototype.handleTechProgress_ = function () {
						this.trigger("progress")
					},
					b.prototype.handleTechEnded_ = function () {
						this.addClass("vjs-ended"),
						this.options_.loop ? (this.currentTime(0), this.play()) : this.paused() || this.pause(),
						this.trigger("ended")
					},
					b.prototype.handleTechDurationChange_ = function () {
						this.duration(this.techGet_("duration"))
					},
					b.prototype.handleTechClick_ = function (a) {
						0 === a.button && this.controls() && (this.paused() ? this.play() : this.pause())
					},
					b.prototype.handleTechTap_ = function () {
						this.userActive(!this.userActive())
					},
					b.prototype.handleTechTouchStart_ = function () {
						this.userWasActive = this.userActive()
					},
					b.prototype.handleTechTouchMove_ = function () {
						this.userWasActive && this.reportUserActivity()
					},
					b.prototype.handleTechTouchEnd_ = function (a) {
						a.preventDefault()
					},
					b.prototype.handleFullscreenChange_ = function () {
						this.isFullscreen() ? this.addClass("vjs-fullscreen") : this.removeClass("vjs-fullscreen")
					},
					b.prototype.handleStageClick_ = function () {
						this.reportUserActivity()
					},
					b.prototype.handleTechFullscreenChange_ = function (a, b) {
						b && this.isFullscreen(b.isFullscreen),
						this.trigger("fullscreenchange")
					},
					b.prototype.handleTechError_ = function () {
						var a = this.tech_.error();
						this.error(a && a.code)
					},
					b.prototype.handleTechSuspend_ = function () {
						this.trigger("suspend")
					},
					b.prototype.handleTechAbort_ = function () {
						this.trigger("abort")
					},
					b.prototype.handleTechEmptied_ = function () {
						this.trigger("emptied")
					},
					b.prototype.handleTechStalled_ = function () {
						this.trigger("stalled")
					},
					b.prototype.handleTechLoadedMetaData_ = function () {
						this.trigger("loadedmetadata")
					},
					b.prototype.handleTechLoadedData_ = function () {
						this.trigger("loadeddata")
					},
					b.prototype.handleTechTimeUpdate_ = function () {
						this.trigger("timeupdate")
					},
					b.prototype.handleTechRateChange_ = function () {
						this.trigger("ratechange")
					},
					b.prototype.handleTechVolumeChange_ = function () {
						this.trigger("volumechange")
					},
					b.prototype.handleTechTextTrackChange_ = function () {
						this.trigger("texttrackchange")
					},
					b.prototype.getCache = function () {
						return this.cache_
					},
					b.prototype.techCall_ = function (a, b) {
						if (this.tech_ && !this.tech_.isReady_)
							this.tech_.ready(function () {
								this[a](b)
							}, !0);
						else
							try {
								this.tech_[a](b)
							} catch (c) {
								throw y["default"](c),
								c
							}
					},
					b.prototype.techGet_ = function (a) {
						if (this.tech_ && this.tech_.isReady_)
							try {
								return this.tech_[a]()
							} catch (b) {
								throw void 0 === this.tech_[a] ? y["default"]("Video.js: " + a + " method not defined for " + this.techName_ + " playback technology.", b) : "TypeError" === b.name ? (y["default"]("Video.js: " + a + " unavailable on " + this.techName_ + " playback technology element.", b), this.tech_.isReady_ = !1) : y["default"](b),
								b
							}
					},
					b.prototype.play = function () {
						return this.techCall_("play"),
						this
					},
					b.prototype.pause = function () {
						return this.techCall_("pause"),
						this
					},
					b.prototype.paused = function () {
						return this.techGet_("paused") === !1 ? !1 : !0
					},
					b.prototype.scrubbing = function (a) {
						return void 0 !== a ? (this.scrubbing_ = !!a, a ? this.addClass("vjs-scrubbing") : this.removeClass("vjs-scrubbing"), this) : this.scrubbing_
					},
					b.prototype.currentTime = function (a) {
						return void 0 !== a ? (this.techCall_("setCurrentTime", a), this) : this.cache_.currentTime = this.techGet_("currentTime") || 0
					},
					b.prototype.duration = function (a) {
						return void 0 === a ? this.cache_.duration || 0 : (a = parseFloat(a) || 0, 0 > a && (a = 1 / 0), a !== this.cache_.duration && (this.cache_.duration = a, a === 1 / 0 ? this.addClass("vjs-live") : this.removeClass("vjs-live"), this.trigger("durationchange")), this)
					},
					b.prototype.remainingTime = function () {
						return this.duration() - this.currentTime()
					},
					b.prototype.buffered = function c() {
						var c = this.techGet_("buffered");
						return c && c.length || (c = B.createTimeRange(0, 0)),
						c
					},
					b.prototype.bufferedPercent = function () {
						return C.bufferedPercent(this.buffered(), this.duration())
					},
					b.prototype.bufferedEnd = function () {
						var a = this.buffered(),
						b = this.duration(),
						c = a.end(a.length - 1);
						return c > b && (c = b),
						c
					},
					b.prototype.volume = function (a) {
						var b = void 0;
						return void 0 !== a ? (b = Math.max(0, Math.min(1, parseFloat(a))), this.cache_.volume = b, this.techCall_("setVolume", b), this) : (b = parseFloat(this.techGet_("volume")), isNaN(b) ? 1 : b)
					},
					b.prototype.muted = function (a) {
						return void 0 !== a ? (this.techCall_("setMuted", a), this) : this.techGet_("muted") || !1
					},
					b.prototype.supportsFullScreen = function () {
						return this.techGet_("supportsFullScreen") || !1
					},
					b.prototype.isFullscreen = function (a) {
						return void 0 !== a ? (this.isFullscreen_ = !!a, this) : !!this.isFullscreen_
					},
					b.prototype.requestFullscreen = function () {
						var a = G["default"];
						return this.isFullscreen(!0),
						a.requestFullscreen ? (o.on(k["default"], a.fullscreenchange, s.bind(this, function b() {
									this.isFullscreen(k["default"][a.fullscreenElement]),
									this.isFullscreen() === !1 && o.off(k["default"], a.fullscreenchange, b),
									this.trigger("fullscreenchange")
								})), this.el_[a.requestFullscreen]()) : this.tech_.supportsFullScreen() ? this.techCall_("enterFullScreen") : (this.enterFullWindow(), this.trigger("fullscreenchange")),
						this
					},
					b.prototype.exitFullscreen = function () {
						var a = G["default"];
						return this.isFullscreen(!1),
						a.requestFullscreen ? k["default"][a.exitFullscreen]() : this.tech_.supportsFullScreen() ? this.techCall_("exitFullScreen") : (this.exitFullWindow(), this.trigger("fullscreenchange")),
						this
					},
					b.prototype.enterFullWindow = function () {
						this.isFullWindow = !0,
						this.docOrigOverflow = k["default"].documentElement.style.overflow,
						o.on(k["default"], "keydown", s.bind(this, this.fullWindowOnEscKey)),
						k["default"].documentElement.style.overflow = "hidden",
						q.addElClass(k["default"].body, "vjs-full-window"),
						this.trigger("enterFullWindow")
					},
					b.prototype.fullWindowOnEscKey = function (a) {
						27 === a.keyCode && (this.isFullscreen() === !0 ? this.exitFullscreen() : this.exitFullWindow())
					},
					b.prototype.exitFullWindow = function () {
						this.isFullWindow = !1,
						o.off(k["default"], "keydown", this.fullWindowOnEscKey),
						k["default"].documentElement.style.overflow = this.docOrigOverflow,
						q.removeElClass(k["default"].body, "vjs-full-window"),
						this.trigger("exitFullWindow")
					},
					b.prototype.canPlayType = function (a) {
						for (var b = void 0, c = 0, d = this.options_.techOrder; c < d.length; c++) {
							var e = A["default"](d[c]),
							f = ea["default"].getTech(e);
							if (f || (f = i["default"].getComponent(e)), f) {
								if (f.isSupported() && (b = f.canPlayType(a)))
									return b
							} else
								y["default"].error('The "' + e + '" tech is undefined. Skipped browser support check for that tech.')
						}
						return ""
					},
					b.prototype.selectSource = function (a) {
						var b = this.options_.techOrder.map(A["default"]).map(function (a) {
								return [a, ea["default"].getTech(a) || i["default"].getComponent(a)]
							}).filter(function (a) {
								var b = a[0],
								c = a[1];
								return c ? c.isSupported() : (y["default"].error('The "' + b + '" tech is undefined. Skipped browser support check for that tech.'), !1)
							}),
						c = function (a, b, c) {
							var d = void 0;
							return a.some(function (a) {
								return b.some(function (b) {
									return d = c(a, b),
									d ? !0 : void 0
								})
							}),
							d
						},
						d = void 0,
						e = function (a) {
							return function (b, c) {
								return a(c, b)
							}
						},
						f = function (a, b) {
							var c = a[0],
							d = a[1];
							return d.canPlaySource(b) ? {
								source: b,
								tech: c
							}
							 : void 0
						};
						return d = this.options_.sourceOrder ? c(a, b, e(f)) : c(b, a, f),
						d || !1
					},
					b.prototype.src = function (a) {
						if (void 0 === a)
							return this.techGet_("src");
						var b = ea["default"].getTech(this.techName_);
						return b || (b = i["default"].getComponent(this.techName_)),
						Array.isArray(a) ? this.sourceList_(a) : "string" == typeof a ? this.src({
							src: a
						}) : a instanceof Object && (a.type && !b.canPlaySource(a) ? this.sourceList_([a]) : (this.cache_.src = a.src, this.currentType_ = a.type || "", this.ready(function () {
									b.prototype.hasOwnProperty("setSource") ? this.techCall_("setSource", a) : this.techCall_("src", a.src),
									"auto" === this.options_.preload && this.load(),
									this.options_.autoplay && this.play()
								}, !0))),
						this
					},
					b.prototype.sourceList_ = function (a) {
						var b = this.selectSource(a);
						b ? b.tech === this.techName_ ? this.src(b.source) : this.loadTech_(b.tech, b.source) : (this.setTimeout(function () {
								this.error({
									code: 4,
									message: this.localize(this.options_.notSupportedMessage)
								})
							}, 0), this.triggerReady())
					},
					b.prototype.load = function () {
						return this.techCall_("load"),
						this
					},
					b.prototype.reset = function () {
						return this.loadTech_(A["default"](this.options_.techOrder[0]), null),
						this.techCall_("reset"),
						this
					},
					b.prototype.currentSrc = function () {
						return this.techGet_("currentSrc") || this.cache_.src || ""
					},
					b.prototype.currentType = function () {
						return this.currentType_ || ""
					},
					b.prototype.preload = function (a) {
						return void 0 !== a ? (this.techCall_("setPreload", a), this.options_.preload = a, this) : this.techGet_("preload")
					},
					b.prototype.autoplay = function (a) {
						return void 0 !== a ? (this.techCall_("setAutoplay", a), this.options_.autoplay = a, this) : this.techGet_("autoplay", a)
					},
					b.prototype.loop = function (a) {
						return void 0 !== a ? (this.techCall_("setLoop", a), this.options_.loop = a, this) : this.techGet_("loop")
					},
					b.prototype.poster = function (a) {
						return void 0 === a ? this.poster_ : (a || (a = ""), this.poster_ = a, this.techCall_("setPoster", a), this.trigger("posterchange"), this)
					},
					b.prototype.handleTechPosterChange_ = function () {
						!this.poster_ && this.tech_ && this.tech_.poster && (this.poster_ = this.tech_.poster() || "", this.trigger("posterchange"))
					},
					b.prototype.controls = function (a) {
						return void 0 !== a ? (a = !!a, this.controls_ !== a && (this.controls_ = a, this.usingNativeControls() && this.techCall_("setControls", a), a ? (this.removeClass("vjs-controls-disabled"), this.addClass("vjs-controls-enabled"), this.trigger("controlsenabled"), this.usingNativeControls() || this.addTechControlsListeners_()) : (this.removeClass("vjs-controls-enabled"), this.addClass("vjs-controls-disabled"), this.trigger("controlsdisabled"), this.usingNativeControls() || this.removeTechControlsListeners_())), this) : !!this.controls_
					},
					b.prototype.usingNativeControls = function (a) {
						return void 0 !== a ? (a = !!a, this.usingNativeControls_ !== a && (this.usingNativeControls_ = a, a ? (this.addClass("vjs-using-native-controls"), this.trigger("usingnativecontrols")) : (this.removeClass("vjs-using-native-controls"), this.trigger("usingcustomcontrols"))), this) : !!this.usingNativeControls_
					},
					b.prototype.error = function (a) {
						return void 0 === a ? this.error_ || null : null === a ? (this.error_ = a, this.removeClass("vjs-error"), this.errorDisplay.close(), this) : (this.error_ = a instanceof I["default"] ? a : new I["default"](a), this.addClass("vjs-error"), y["default"].error("(CODE:" + this.error_.code + " " + I["default"].errorTypes[this.error_.code] + ")", this.error_.message, this.error_), this.trigger("error"), this)
					},
					b.prototype.ended = function () {
						return this.techGet_("ended")
					},
					b.prototype.seeking = function () {
						return this.techGet_("seeking")
					},
					b.prototype.seekable = function () {
						return this.techGet_("seekable")
					},
					b.prototype.reportUserActivity = function () {
						this.userActivity_ = !0
					},
					b.prototype.userActive = function (a) {
						return void 0 !== a ? (a = !!a, a !== this.userActive_ && (this.userActive_ = a, a ? (this.userActivity_ = !0, this.removeClass("vjs-user-inactive"), this.addClass("vjs-user-active"), this.trigger("useractive")) : (this.userActivity_ = !1, this.tech_ && this.tech_.one("mousemove", function (a) {
										a.stopPropagation(),
										a.preventDefault()
									}), this.removeClass("vjs-user-active"), this.addClass("vjs-user-inactive"), this.trigger("userinactive"))), this) : this.userActive_
					},
					b.prototype.listenForUserActivity_ = function () {
						var a = void 0,
						b = void 0,
						c = void 0,
						d = s.bind(this, this.reportUserActivity),
						e = function (a) {
							(a.screenX !== b || a.screenY !== c) && (b = a.screenX, c = a.screenY, d())
						},
						f = function () {
							d(),
							this.clearInterval(a),
							a = this.setInterval(d, 250)
						},
						g = function () {
							d(),
							this.clearInterval(a)
						};
						this.on("mousedown", f),
						this.on("mousemove", e),
						this.on("mouseup", g),
						this.on("keydown", d),
						this.on("keyup", d); {
							var h = void 0;
							this.setInterval(function () {
								if (this.userActivity_) {
									this.userActivity_ = !1,
									this.userActive(!0),
									this.clearTimeout(h);
									var a = this.options_.inactivityTimeout;
									a > 0 && (h = this.setTimeout(function () {
												this.userActivity_ || this.userActive(!1)
											}, a))
								}
							}, 250)
						}
					},
					b.prototype.playbackRate = function (a) {
						return void 0 !== a ? (this.techCall_("setPlaybackRate", a), this) : this.tech_ && this.tech_.featuresPlaybackRate ? this.techGet_("playbackRate") : 1
					},
					b.prototype.isAudio = function (a) {
						return void 0 !== a ? (this.isAudio_ = !!a, this) : !!this.isAudio_
					},
					b.prototype.networkState = function () {
						return this.techGet_("networkState")
					},
					b.prototype.readyState = function () {
						return this.techGet_("readyState")
					},
					b.prototype.videoTracks = function () {
						return this.tech_ ? this.tech_.videoTracks() : (this.videoTracks_ = this.videoTracks_ || new U["default"], this.videoTracks_)
					},
					b.prototype.audioTracks = function () {
						return this.tech_ ? this.tech_.audioTracks() : (this.audioTracks_ = this.audioTracks_ || new S["default"], this.audioTracks_)
					},
					b.prototype.textTracks = function () {
						return this.tech_ && this.tech_.textTracks()
					},
					b.prototype.remoteTextTracks = function () {
						return this.tech_ && this.tech_.remoteTextTracks()
					},
					b.prototype.remoteTextTrackEls = function () {
						return this.tech_ && this.tech_.remoteTextTrackEls()
					},
					b.prototype.addTextTrack = function (a, b, c) {
						return this.tech_ && this.tech_.addTextTrack(a, b, c)
					},
					b.prototype.addRemoteTextTrack = function (a) {
						return this.tech_ && this.tech_.addRemoteTextTrack(a)
					},
					b.prototype.removeRemoteTextTrack = function () {
						var a = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0],
						b = a.track,
						c = void 0 === b ? arguments[0] : b;
						this.tech_ && this.tech_.removeRemoteTextTrack(c)
					},
					b.prototype.videoWidth = function () {
						return this.tech_ && this.tech_.videoWidth && this.tech_.videoWidth() || 0
					},
					b.prototype.videoHeight = function () {
						return this.tech_ && this.tech_.videoHeight && this.tech_.videoHeight() || 0
					},
					b.prototype.language = function (a) {
						return void 0 === a ? this.language_ : (this.language_ = ("" + a).toLowerCase(), this)
					},
					b.prototype.languages = function () {
						return O["default"](b.prototype.options_.languages, this.languages_)
					},
					b.prototype.toJSON = function () {
						var a = O["default"](this.options_),
						b = a.tracks;
						a.tracks = [];
						for (var c = 0; c < b.length; c++) {
							var d = b[c];
							d = O["default"](d),
							d.player = void 0,
							a.tracks[c] = d
						}
						return a
					},
					b.prototype.createModal = function (a, b) {
						var c = this;
						b = b || {},
						b.content = a || "";
						var d = new ca["default"](c, b);
						return c.addChild(d),
						d.on("dispose", function () {
							c.removeChild(d)
						}),
						d.open()
					},
					b.getTagSettings = function (a) {
						var b = {
							sources: [],
							tracks: []
						},
						c = q.getElAttributes(a),
						d = c["data-setup"];
						if (null !== d) {
							var e = K["default"](d || "{}"),
							f = e[0],
							g = e[1];
							f && y["default"].error(f),
							M["default"](c, g)
						}
						if (M["default"](b, c), a.hasChildNodes())
							for (var h = a.childNodes, i = 0, j = h.length; j > i; i++) {
								var k = h[i],
								l = k.nodeName.toLowerCase();
								"source" === l ? b.sources.push(q.getElAttributes(k)) : "track" === l && b.tracks.push(q.getElAttributes(k))
							}
						return b
					},
					b
				}
					(i["default"]));
				ga.players = {};
				var ha = m["default"].navigator;
				ga.prototype.options_ = {
					techOrder: ["html5", "flash"],
					html5: {},
					flash: {},
					defaultVolume: 0,
					inactivityTimeout: 2e3,
					playbackRates: [],
					children: ["mediaLoader", "posterImage", "textTrackDisplay", "loadingSpinner", "bigPlayButton", "controlBar", "errorDisplay", "textTrackSettings"],
					language: k["default"].getElementsByTagName("html")[0].getAttribute("lang") || ha.languages && ha.languages[0] || ha.userLanguage || ha.language || "en",
					languages: {},
					notSupportedMessage: "No compatible source was found for this media."
				},
				ga.prototype.handleLoadedMetaData_,
				ga.prototype.handleLoadedData_,
				ga.prototype.handleUserActive_,
				ga.prototype.handleUserInactive_,
				ga.prototype.handleTimeUpdate_,
				ga.prototype.handleTechEnded_,
				ga.prototype.handleVolumeChange_,
				ga.prototype.handleError_,
				ga.prototype.flexNotSupported_ = function () {
					var a = k["default"].createElement("i");
					return !("flexBasis" in a.style || "webkitFlexBasis" in a.style || "mozFlexBasis" in a.style || "msFlexBasis" in a.style || "msFlexOrder" in a.style)
				},
				i["default"].registerComponent("Player", ga),
				c["default"] = ga,
				b.exports = c["default"]
			}, {
				"./big-play-button.js": 63,
				"./component.js": 67,
				"./control-bar/control-bar.js": 70,
				"./error-display.js": 103,
				"./fullscreen-api.js": 106,
				"./loading-spinner.js": 107,
				"./media-error.js": 108,
				"./modal-dialog": 112,
				"./poster-image.js": 117,
				"./tech/html5.js": 122,
				"./tech/loader.js": 123,
				"./tech/tech.js": 124,
				"./tracks/audio-track-list.js": 125,
				"./tracks/text-track-display.js": 130,
				"./tracks/text-track-list-converter.js": 131,
				"./tracks/text-track-settings.js": 133,
				"./tracks/video-track-list.js": 138,
				"./utils/browser.js": 140,
				"./utils/buffer.js": 141,
				"./utils/dom.js": 143,
				"./utils/events.js": 144,
				"./utils/fn.js": 145,
				"./utils/guid.js": 147,
				"./utils/log.js": 148,
				"./utils/merge-options.js": 149,
				"./utils/stylesheet.js": 150,
				"./utils/time-ranges.js": 151,
				"./utils/to-title-case.js": 152,
				"global/document": 1,
				"global/window": 2,
				"object.assign": 45,
				"safe-json-parse/tuple": 54
			}
		],
		114: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				var e = a("./player.js"),
				f = d(e),
				g = function (a, b) {
					f["default"].prototype[a] = b
				};
				c["default"] = g,
				b.exports = c["default"]
			}, {
				"./player.js": 113
			}
		],
		115: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../clickable-component.js"),
				i = e(h),
				j = a("../component.js"),
				k = e(j),
				l = a("./popup.js"),
				m = (e(l), a("../utils/dom.js")),
				n = (d(m), a("../utils/fn.js")),
				o = (d(n), a("../utils/to-title-case.js")),
				p = (e(o), function (a) {
					function b(c) {
						var d = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1];
						f(this, b),
						a.call(this, c, d),
						this.update()
					}
					return g(b, a),
					b.prototype.update = function () {
						var a = this.createPopup();
						this.popup && this.removeChild(this.popup),
						this.popup = a,
						this.addChild(a),
						this.items && 0 === this.items.length ? this.hide() : this.items && this.items.length > 1 && this.show()
					},
					b.prototype.createPopup = function () {},
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: this.buildCSSClass()
						})
					},
					b.prototype.buildCSSClass = function () {
						var b = "vjs-menu-button";
						return b += this.options_.inline === !0 ? "-inline" : "-popup",
						"vjs-menu-button " + b + " " + a.prototype.buildCSSClass.call(this)
					},
					b
				}
					(i["default"]));
				k["default"].registerComponent("PopupButton", p),
				c["default"] = p,
				b.exports = c["default"]
			}, {
				"../clickable-component.js": 65,
				"../component.js": 67,
				"../utils/dom.js": 143,
				"../utils/fn.js": 145,
				"../utils/to-title-case.js": 152,
				"./popup.js": 116
			}
		],
		116: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../component.js"),
				i = e(h),
				j = a("../utils/dom.js"),
				k = d(j),
				l = a("../utils/fn.js"),
				m = d(l),
				n = a("../utils/events.js"),
				o = d(n),
				p = function (a) {
					function b() {
						f(this, b),
						a.apply(this, arguments)
					}
					return g(b, a),
					b.prototype.addItem = function (a) {
						this.addChild(a),
						a.on("click", m.bind(this, function () {
								this.unlockShowing()
							}))
					},
					b.prototype.createEl = function () {
						var b = this.options_.contentElType || "ul";
						this.contentEl_ = k.createEl(b, {
								className: "vjs-menu-content"
							});
						var c = a.prototype.createEl.call(this, "div", {
								append: this.contentEl_,
								className: "vjs-menu"
							});
						return c.appendChild(this.contentEl_),
						o.on(c, "click", function (a) {
							a.preventDefault(),
							a.stopImmediatePropagation()
						}),
						c
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("Popup", p),
				c["default"] = p,
				b.exports = c["default"]
			}, {
				"../component.js": 67,
				"../utils/dom.js": 143,
				"../utils/events.js": 144,
				"../utils/fn.js": 145
			}
		],
		117: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./clickable-component.js"),
				i = e(h),
				j = a("./component.js"),
				k = e(j),
				l = a("./utils/fn.js"),
				m = d(l),
				n = a("./utils/dom.js"),
				o = d(n),
				p = a("./utils/browser.js"),
				q = d(p),
				r = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.update(),
						c.on("posterchange", m.bind(this, this.update))
					}
					return g(b, a),
					b.prototype.dispose = function () {
						this.player().off("posterchange", this.update),
						a.prototype.dispose.call(this)
					},
					b.prototype.createEl = function () {
						var a = o.createEl("div", {
								className: "vjs-poster",
								tabIndex: -1
							});
						return q.BACKGROUND_SIZE_SUPPORTED || (this.fallbackImg_ = o.createEl("img"), a.appendChild(this.fallbackImg_)),
						a
					},
					b.prototype.update = function () {
						var a = this.player().poster();
						this.setSrc(a),
						a ? this.show() : this.hide()
					},
					b.prototype.setSrc = function (a) {
						if (this.fallbackImg_)
							this.fallbackImg_.src = a;
						else {
							var b = "";
							a && (b = 'url("' + a + '")'),
							this.el_.style.backgroundImage = b
						}
					},
					b.prototype.handleClick = function () {
						this.player_.paused() ? this.player_.play() : this.player_.pause()
					},
					b
				}
				(i["default"]);
				k["default"].registerComponent("PosterImage", r),
				c["default"] = r,
				b.exports = c["default"]
			}, {
				"./clickable-component.js": 65,
				"./component.js": 67,
				"./utils/browser.js": 140,
				"./utils/dom.js": 143,
				"./utils/fn.js": 145
			}
		],
		118: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				c.__esModule = !0;
				var f = a("./utils/events.js"),
				g = e(f),
				h = a("global/document"),
				i = d(h),
				j = a("global/window"),
				k = d(j),
				l = !1,
				m = void 0,
				n = function () {
					var a = i["default"].getElementsByTagName("video"),
					b = i["default"].getElementsByTagName("audio"),
					c = [];
					if (a && a.length > 0)
						for (var d = 0, e = a.length; e > d; d++)
							c.push(a[d]);
					if (b && b.length > 0)
						for (var d = 0, e = b.length; e > d; d++)
							c.push(b[d]);
					if (c && c.length > 0)
						for (var d = 0, e = c.length; e > d; d++) {
							var f = c[d];
							if (!f || !f.getAttribute) {
								o(1);
								break
							}
							if (void 0 === f.player) {
								var g = f.getAttribute("data-setup");
								if (null !== g) {
									m(f)
								}
							}
						}
					else
						l || o(1)
				},
				o = function (a, b) {
					b && (m = b),
					setTimeout(n, a)
				};
				"complete" === i["default"].readyState ? l = !0 : g.one(k["default"], "load", function () {
						l = !0
					});
				var p = function () {
					return l
				};
				c.autoSetup = n,
				c.autoSetupTimeout = o,
				c.hasLoaded = p
			}, {
				"./utils/events.js": 144,
				"global/document": 1,
				"global/window": 2
			}
		],
		119: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../component.js"),
				i = e(h),
				j = a("../utils/dom.js"),
				k = d(j),
				l = a("object.assign"),
				m = e(l),
				n = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.bar = this.getChild(this.options_.barName),
						this.vertical(!!this.options_.vertical),
						this.on("mousedown", this.handleMouseDown),
						this.on("touchstart", this.handleMouseDown),
						this.on("focus", this.handleFocus),
						this.on("blur", this.handleBlur),
						this.on("click", this.handleClick),
						this.on(c, "controlsvisible", this.update),
						this.on(c, this.playerEvent, this.update)
					}
					return g(b, a),
					b.prototype.createEl = function (b) {
						var c = arguments.length <= 1 || void 0 === arguments[1] ? {}
						 : arguments[1],
						d = arguments.length <= 2 || void 0 === arguments[2] ? {}
						 : arguments[2];
						return c.className = c.className + " vjs-slider",
						c = m["default"]({
								tabIndex: 0
							}, c),
						d = m["default"]({
								role: "slider",
								"aria-valuenow": 0,
								"aria-valuemin": 0,
								"aria-valuemax": 100,
								tabIndex: 0
							}, d),
						a.prototype.createEl.call(this, b, c, d)
					},
					b.prototype.handleMouseDown = function (a) {
						var b = this.bar.el_.ownerDocument;
						a.preventDefault(),
						k.blockTextSelection(),
						this.addClass("vjs-sliding"),
						this.trigger("slideractive"),
						this.on(b, "mousemove", this.handleMouseMove),
						this.on(b, "mouseup", this.handleMouseUp),
						this.on(b, "touchmove", this.handleMouseMove),
						this.on(b, "touchend", this.handleMouseUp),
						this.handleMouseMove(a)
					},
					b.prototype.handleMouseMove = function () {},
					b.prototype.handleMouseUp = function () {
						var a = this.bar.el_.ownerDocument;
						k.unblockTextSelection(),
						this.removeClass("vjs-sliding"),
						this.trigger("sliderinactive"),
						this.off(a, "mousemove", this.handleMouseMove),
						this.off(a, "mouseup", this.handleMouseUp),
						this.off(a, "touchmove", this.handleMouseMove),
						this.off(a, "touchend", this.handleMouseUp),
						this.update()
					},
					b.prototype.update = function () {
						if (this.el_) {
							var a = this.getPercent(),
							b = this.bar;
							if (b) {
								("number" != typeof a || a !== a || 0 > a || a === 1 / 0) && (a = 0);
								var c = (100 * a).toFixed(2) + "%";
								this.vertical() ? b.el().style.height = c : b.el().style.width = c
							}
						}
					},
					b.prototype.calculateDistance = function (a) {
						var b = k.getPointerPosition(this.el_, a);
						return this.vertical() ? b.y : b.x
					},
					b.prototype.handleFocus = function () {
						this.on(this.bar.el_.ownerDocument, "keydown", this.handleKeyPress)
					},
					b.prototype.handleKeyPress = function (a) {
						37 === a.which || 40 === a.which ? (a.preventDefault(), this.stepBack()) : (38 === a.which || 39 === a.which) && (a.preventDefault(), this.stepForward())
					},
					b.prototype.handleBlur = function () {
						this.off(this.bar.el_.ownerDocument, "keydown", this.handleKeyPress)
					},
					b.prototype.handleClick = function (a) {
						a.stopImmediatePropagation(),
						a.preventDefault()
					},
					b.prototype.vertical = function (a) {
						return void 0 === a ? this.vertical_ || !1 : (this.vertical_ = !!a, this.addClass(this.vertical_ ? "vjs-slider-vertical" : "vjs-slider-horizontal"), this)
					},
					b
				}
				(i["default"]);
				i["default"].registerComponent("Slider", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../component.js": 67,
				"../utils/dom.js": 143,
				"object.assign": 45
			}
		],
		120: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a.streamingFormats = {
						"rtmp/mp4": "MP4",
						"rtmp/flv": "FLV"
					},
					a.streamFromParts = function (a, b) {
						return a + "&" + b
					},
					a.streamToParts = function (a) {
						var b = {
							connection: "",
							stream: ""
						};

						if (!a)
							return b;
						var c = a.search(/&(?!\w+=)/),
						d = void 0;
						return -1 !== c ? d = c + 1 : (c = d = a.lastIndexOf("/") + 1, 0 === c && (c = d = a.length)),
						b.connection = a.substring(0, c),
						b.stream = a.substring(d, a.length),
						b
					},
					a.isStreamingType = function (b) {
						return b in a.streamingFormats
					},
					a.RTMP_RE = /^rtmp[set]?:\/\//i,
					a.isStreamingSrc = function (b) {
						return a.RTMP_RE.test(b)
					},
					a.rtmpSourceHandler = {},
					a.rtmpSourceHandler.canPlayType = function (b) {
						return a.isStreamingType(b) ? "maybe" : ""
					},
					a.rtmpSourceHandler.canHandleSource = function (b) {
						var c = a.rtmpSourceHandler.canPlayType(b.type);
						return c ? c : a.isStreamingSrc(b.src) ? "maybe" : ""
					},
					a.rtmpSourceHandler.handleSource = function (b, c) {
						var d = a.streamToParts(b.src);
						c.setRtmpConnection(d.connection),
						c.setRtmpStream(d.stream)
					},
					a.registerSourceHandler(a.rtmpSourceHandler),
					a
				}
				c.__esModule = !0,
				c["default"] = d,
				b.exports = c["default"]
			}, {}
		],
		121: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				function h(a) {
					var b = a.charAt(0).toUpperCase() + a.slice(1);
					A["set" + b] = function (b) {
						return this.el_.vjs_setProperty(a, b)
					}
				}
				function i(a) {
					A[a] = function () {
						return this.el_.vjs_getProperty(a)
					}
				}
				c.__esModule = !0;
				for (var j = a("./tech"), k = e(j), l = a("../utils/dom.js"), m = d(l), n = a("../utils/url.js"), o = d(n), p = a("../utils/time-ranges.js"), q = a("./flash-rtmp"), r = e(q), s = a("../component"), t = e(s), u = a("global/window"), v = e(u), w = a("object.assign"), x = e(w), y = v["default"].navigator, z = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						c.source && this.ready(function () {
							this.setSource(c.source)
						}, !0),
						c.startTime && this.ready(function () {
							this.load(),
							this.play(),
							this.currentTime(c.startTime)
						}, !0),
						v["default"].videojs = v["default"].videojs || {},
						v["default"].videojs.Flash = v["default"].videojs.Flash || {},
						v["default"].videojs.Flash.onReady = b.onReady,
						v["default"].videojs.Flash.onEvent = b.onEvent,
						v["default"].videojs.Flash.onError = b.onError,
						this.on("seeked", function () {
							this.lastSeekTarget_ = void 0
						})
					}
					return g(b, a),
					b.prototype.createEl = function () {
						var a = this.options_;
						a.swf || (a.swf = "//vjs.zencdn.net/swf/5.0.1/video-js.swf");
						var c = a.techId,
						d = x["default"]({
								readyFunction: "videojs.Flash.onReady",
								eventProxyFunction: "videojs.Flash.onEvent",
								errorEventProxyFunction: "videojs.Flash.onError",
								autoplay: a.autoplay,
								preload: a.preload,
								loop: a.loop,
								muted: a.muted
							}, a.flashVars),
						e = x["default"]({
								wmode: "opaque",
								bgcolor: "#000000"
							}, a.params),
						f = x["default"]({
								id: c,
								name: c,
								"class": "vjs-tech"
							}, a.attributes);
						return this.el_ = b.embed(a.swf, d, e, f),
						this.el_.tech = this,
						this.el_
					},
					b.prototype.play = function () {
						this.ended() && this.setCurrentTime(0),
						this.el_.vjs_play()
					},
					b.prototype.pause = function () {
						this.el_.vjs_pause()
					},
					b.prototype.src = function (a) {
						return void 0 === a ? this.currentSrc() : this.setSrc(a)
					},
					b.prototype.setSrc = function (a) {
						if (a = o.getAbsoluteURL(a), this.el_.vjs_src(a), this.autoplay()) {
							var b = this;
							this.setTimeout(function () {
								b.play()
							}, 0)
						}
					},
					b.prototype.seeking = function () {
						return void 0 !== this.lastSeekTarget_
					},
					b.prototype.setCurrentTime = function (b) {
						var c = this.seekable();
						c.length && (b = b > c.start(0) ? b : c.start(0), b = b < c.end(c.length - 1) ? b : c.end(c.length - 1), this.lastSeekTarget_ = b, this.trigger("seeking"), this.el_.vjs_setProperty("currentTime", b), a.prototype.setCurrentTime.call(this))
					},
					b.prototype.currentTime = function () {
						return this.seeking() ? this.lastSeekTarget_ || 0 : this.el_.vjs_getProperty("currentTime")
					},
					b.prototype.currentSrc = function () {
						return this.currentSource_ ? this.currentSource_.src : this.el_.vjs_getProperty("currentSrc")
					},
					b.prototype.load = function () {
						this.el_.vjs_load()
					},
					b.prototype.poster = function () {
						this.el_.vjs_getProperty("poster")
					},
					b.prototype.setPoster = function () {},
					b.prototype.seekable = function () {
						var a = this.duration();
						return 0 === a ? p.createTimeRange() : p.createTimeRange(0, a)
					},
					b.prototype.buffered = function () {
						var a = this.el_.vjs_getProperty("buffered");
						return 0 === a.length ? p.createTimeRange() : p.createTimeRange(a[0][0], a[0][1])
					},
					b.prototype.supportsFullScreen = function () {
						return !1
					},
					b.prototype.enterFullScreen = function () {
						return !1
					},
					b
				}
					(k["default"]), A = z.prototype, B = "rtmpConnection,rtmpStream,preload,defaultPlaybackRate,playbackRate,autoplay,loop,mediaGroup,controller,controls,volume,muted,defaultMuted".split(","), C = "networkState,readyState,initialTime,duration,startOffsetTime,paused,ended,videoWidth,videoHeight".split(","), D = 0; D < B.length; D++)
					i(B[D]), h(B[D]);
				for (var D = 0; D < C.length; D++)
					i(C[D]);
				z.isSupported = function () {
					return z.version()[0] >= 10
				},
				k["default"].withSourceHandlers(z),
				z.nativeSourceHandler = {},
				z.nativeSourceHandler.canPlayType = function (a) {
					return a in z.formats ? "maybe" : ""
				},
				z.nativeSourceHandler.canHandleSource = function (a) {
					function b(a) {
						var b = o.getFileExtension(a);
						return b ? "video/" + b : ""
					}
					var c;
					return c = a.type ? a.type.replace(/;.*/, "").toLowerCase() : b(a.src),
					z.nativeSourceHandler.canPlayType(c)
				},
				z.nativeSourceHandler.handleSource = function (a, b) {
					b.setSrc(a.src)
				},
				z.nativeSourceHandler.dispose = function () {},
				z.registerSourceHandler(z.nativeSourceHandler),
				z.formats = {
					"video/flv": "FLV",
					"video/x-flv": "FLV",
					"video/mp4": "MP4",
					"video/m4v": "MP4"
				},
				z.onReady = function (a) {
					var b = m.getEl(a),
					c = b && b.tech;
					c && c.el() && z.checkReady(c)
				},
				z.checkReady = function (a) {
					a.el() && (a.el().vjs_getProperty ? a.triggerReady() : this.setTimeout(function () {
							z.checkReady(a)
						}, 50))
				},
				z.onEvent = function (a, b) {
					var c = m.getEl(a).tech;
					c.trigger(b)
				},
				z.onError = function (a, b) {
					var c = m.getEl(a).tech;
					return "srcnotfound" === b ? c.error(4) : void c.error("FLASH: " + b)
				},
				z.version = function () {
					var a = "0,0,0";
					try {
						a = new v["default"].ActiveXObject("ShockwaveFlash.ShockwaveFlash").GetVariable("$version").replace(/\D+/g, ",").match(/^,?(.+),?$/)[1]
					} catch (b) {
						try {
							y.mimeTypes["application/x-shockwave-flash"].enabledPlugin && (a = (y.plugins["Shockwave Flash 2.0"] || y.plugins["Shockwave Flash"]).description.replace(/\D+/g, ",").match(/^,?(.+),?$/)[1])
						} catch (c) {}
					}
					return a.split(",")
				},
				z.embed = function (a, b, c, d) {
					var e = z.getEmbedCode(a, b, c, d),
					f = m.createEl("div", {
							innerHTML: e
						}).childNodes[0];
					return f
				},
				z.getEmbedCode = function (a, b, c, d) {
					var e = '<object type="application/x-shockwave-flash" ',
					f = "",
					g = "",
					h = "";
					return b && Object.getOwnPropertyNames(b).forEach(function (a) {
						f += a + "=" + b[a] + "&amp;"
					}),
					c = x["default"]({
							movie: a,
							flashvars: f,
							allowScriptAccess: "always",
							allowNetworking: "all"
						}, c),
					Object.getOwnPropertyNames(c).forEach(function (a) {
						g += '<param name="' + a + '" value="' + c[a] + '" />'
					}),
					d = x["default"]({
							data: a,
							width: "100%",
							height: "100%"
						}, d),
					Object.getOwnPropertyNames(d).forEach(function (a) {
						h += a + '="' + d[a] + '" '
					}),
					"" + e + h + ">" + g + "</object>"
				},
				r["default"](z),
				t["default"].registerComponent("Flash", z),
				k["default"].registerTech("Flash", z),
				c["default"] = z,
				b.exports = c["default"]
			}, {
				"../component": 67,
				"../utils/dom.js": 143,
				"../utils/time-ranges.js": 151,
				"../utils/url.js": 153,
				"./flash-rtmp": 120,
				"./tech": 124,
				"global/window": 2,
				"object.assign": 45
			}
		],
		122: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				function h(a, b) {
					return a.raw = b,
					a
				}
				c.__esModule = !0;
				var i = h(["Text Tracks are being loaded from another origin but the crossorigin attribute isn't used. \n            This may prevent text tracks from loading."], ["Text Tracks are being loaded from another origin but the crossorigin attribute isn't used. \n            This may prevent text tracks from loading."]),
				j = a("./tech.js"),
				k = e(j),
				l = a("../component"),
				m = e(l),
				n = a("../utils/dom.js"),
				o = d(n),
				p = a("../utils/url.js"),
				q = d(p),
				r = a("../utils/fn.js"),
				s = d(r),
				t = a("../utils/log.js"),
				u = e(t),
				v = a("tsml"),
				w = e(v),
				x = a("../../../src/js/tracks/text-track.js"),
				y = (e(x), a("../utils/browser.js")),
				z = d(y),
				A = a("global/document"),
				B = e(A),
				C = a("global/window"),
				D = e(C),
				E = a("object.assign"),
				F = e(E),
				G = a("../utils/merge-options.js"),
				H = e(G),
				I = a("../utils/to-title-case.js"),
				J = e(I),
				K = function (a) {
					function b(c, d) {
						var e = this;
						f(this, b),
						a.call(this, c, d);
						var g = c.source,
						h = !1;
						if (g && (this.el_.currentSrc !== g.src || c.tag && 3 === c.tag.initNetworkState_) ? this.setSource(g) : this.handleLateInit_(this.el_), this.el_.hasChildNodes()) {
							for (var j = this.el_.childNodes, k = j.length, l = []; k--; ) {
								var m = j[k],
								n = m.nodeName.toLowerCase();
								"track" === n && (this.featuresNativeTextTracks ? (this.remoteTextTrackEls().addTrackElement_(m), this.remoteTextTracks().addTrack_(m.track), h || this.el_.hasAttribute("crossorigin") || !q.isCrossOrigin(m.src) || (h = !0)) : l.push(m))
							}
							for (var o = 0; o < l.length; o++)
								this.el_.removeChild(l[o])
						}
						var p = ["audio", "video"];
						p.forEach(function (a) {
							var b = J["default"](a);
							if (e["featuresNative" + b + "Tracks"]) {
								var c = e.el()[a + "Tracks"];
								c && c.addEventListener && (c.addEventListener("change", s.bind(e, e["handle" + b + "TrackChange_"])), c.addEventListener("addtrack", s.bind(e, e["handle" + b + "TrackAdd_"])), c.addEventListener("removetrack", s.bind(e, e["handle" + b + "TrackRemove_"])))
							}
						}),
						this.featuresNativeTextTracks && (h && u["default"].warn(w["default"](i)), this.handleTextTrackChange_ = s.bind(this, this.handleTextTrackChange), this.handleTextTrackAdd_ = s.bind(this, this.handleTextTrackAdd), this.handleTextTrackRemove_ = s.bind(this, this.handleTextTrackRemove), this.proxyNativeTextTracks_()),
						(z.TOUCH_ENABLED && c.nativeControlsForTouch === !0 || z.IS_IPHONE || z.IS_NATIVE_ANDROID) && this.setControls(!0),
						this.triggerReady()
					}
					return g(b, a),
					b.prototype.dispose = function () {
						var c = this;
						["audio", "video", "text"].forEach(function (a) {
							var b = J["default"](a),
							d = c.el_[a + "Tracks"];
							d && d.removeEventListener && (d.removeEventListener("change", c["handle" + b + "TrackChange_"]), d.removeEventListener("addtrack", c["handle" + b + "TrackAdd_"]), d.removeEventListener("removetrack", c["handle" + b + "TrackRemove_"]))
						}),
						b.disposeMediaElement(this.el_),
						a.prototype.dispose.call(this)
					},
					b.prototype.createEl = function () {
						var a = this.options_.tag;
						if (!a || this.movingMediaElementInDOM === !1)
							if (a) {
								var c = a.cloneNode(!0);
								a.parentNode.insertBefore(c, a),
								b.disposeMediaElement(a),
								a = c
							} else {
								a = B["default"].createElement("video");
								var d = this.options_.tag && o.getElAttributes(this.options_.tag),
								e = H["default"]({}, d);
								z.TOUCH_ENABLED && this.options_.nativeControlsForTouch === !0 || delete e.controls,
								o.setElAttributes(a, F["default"](e, {
										id: this.options_.techId,
										"class": "vjs-tech"
									}))
							}
						for (var f = ["autoplay", "preload", "loop", "muted"], g = f.length - 1; g >= 0; g--) {
							var h = f[g],
							i = {};
							"undefined" != typeof this.options_[h] && (i[h] = this.options_[h]),
							o.setElAttributes(a, i)
						}
						return a
					},
					b.prototype.handleLateInit_ = function (a) {
						var b = this;
						if (0 !== a.networkState && 3 !== a.networkState) {
							if (0 === a.readyState) {
								var c = function () {
									var a = !1,
									c = function () {
										a = !0
									};
									b.on("loadstart", c);
									var d = function () {
										a || this.trigger("loadstart")
									};
									return b.on("loadedmetadata", d),
									b.ready(function () {
										this.off("loadstart", c),
										this.off("loadedmetadata", d),
										a || this.trigger("loadstart")
									}), {
										v: void 0
									}
								}
								();
								if ("object" == typeof c)
									return c.v
							}
							var d = ["loadstart"];
							d.push("loadedmetadata"),
							a.readyState >= 2 && d.push("loadeddata"),
							a.readyState >= 3 && d.push("canplay"),
							a.readyState >= 4 && d.push("canplaythrough"),
							this.ready(function () {
								d.forEach(function (a) {
									this.trigger(a)
								}, this)
							})
						}
					},
					b.prototype.proxyNativeTextTracks_ = function () {
						var a = this.el().textTracks;
						if (a) {
							for (var b = 0; b < a.length; b++)
								this.textTracks().addTrack_(a[b]);
							a.addEventListener && (a.addEventListener("change", this.handleTextTrackChange_), a.addEventListener("addtrack", this.handleTextTrackAdd_), a.addEventListener("removetrack", this.handleTextTrackRemove_))
						}
					},
					b.prototype.handleTextTrackChange = function () {
						var a = this.textTracks();
						this.textTracks().trigger({
							type: "change",
							target: a,
							currentTarget: a,
							srcElement: a
						})
					},
					b.prototype.handleTextTrackAdd = function (a) {
						this.textTracks().addTrack_(a.track)
					},
					b.prototype.handleTextTrackRemove = function (a) {
						this.textTracks().removeTrack_(a.track)
					},
					b.prototype.handleVideoTrackChange_ = function () {
						var a = this.videoTracks();
						this.videoTracks().trigger({
							type: "change",
							target: a,
							currentTarget: a,
							srcElement: a
						})
					},
					b.prototype.handleVideoTrackAdd_ = function (a) {
						this.videoTracks().addTrack_(a.track)
					},
					b.prototype.handleVideoTrackRemove_ = function (a) {
						this.videoTracks().removeTrack_(a.track)
					},
					b.prototype.handleAudioTrackChange_ = function () {
						var a = this.audioTracks();
						this.audioTracks().trigger({
							type: "change",
							target: a,
							currentTarget: a,
							srcElement: a
						})
					},
					b.prototype.handleAudioTrackAdd_ = function (a) {
						this.audioTracks().addTrack_(a.track)
					},
					b.prototype.handleAudioTrackRemove_ = function (a) {
						this.audioTracks().removeTrack_(a.track)
					},
					b.prototype.play = function () {
						this.el_.play()
					},
					b.prototype.pause = function () {
						this.el_.pause()
					},
					b.prototype.paused = function () {
						return this.el_.paused
					},
					b.prototype.currentTime = function () {
						return this.el_.currentTime
					},
					b.prototype.setCurrentTime = function (a) {
						try {
							this.el_.currentTime = a
						} catch (b) {
							u["default"](b, "Video is not ready. (Video.js)")
						}
					},
					b.prototype.duration = function () {
						return this.el_.duration || 0
					},
					b.prototype.buffered = function () {
						return this.el_.buffered
					},
					b.prototype.volume = function () {
						return this.el_.volume
					},
					b.prototype.setVolume = function (a) {
						this.el_.volume = a
					},
					b.prototype.muted = function () {
						return this.el_.muted
					},
					b.prototype.setMuted = function (a) {
						this.el_.muted = a
					},
					b.prototype.width = function () {
						return this.el_.offsetWidth
					},
					b.prototype.height = function () {
						return this.el_.offsetHeight
					},
					b.prototype.supportsFullScreen = function () {
						if ("function" == typeof this.el_.webkitEnterFullScreen) {
							var a = D["default"].navigator.userAgent;
							if (/Android/.test(a) || !/Chrome|Mac OS X 10.5/.test(a))
								return !0
						}
						return !1
					},
					b.prototype.enterFullScreen = function () {
						var a = this.el_;
						"webkitDisplayingFullscreen" in a && this.one("webkitbeginfullscreen", function () {
							this.one("webkitendfullscreen", function () {
								this.trigger("fullscreenchange", {
									isFullscreen: !1
								})
							}),
							this.trigger("fullscreenchange", {
								isFullscreen: !0
							})
						}),
						a.paused && a.networkState <= a.HAVE_METADATA ? (this.el_.play(), this.setTimeout(function () {
								a.pause(),
								a.webkitEnterFullScreen()
							}, 0)) : a.webkitEnterFullScreen()
					},
					b.prototype.exitFullScreen = function () {
						this.el_.webkitExitFullScreen()
					},
					b.prototype.src = function (a) {
						return void 0 === a ? this.el_.src : void this.setSrc(a)
					},
					b.prototype.setSrc = function (a) {
						this.el_.src = a
					},
					b.prototype.load = function () {
						this.el_.load()
					},
					b.prototype.reset = function () {
						b.resetMediaElement(this.el_)
					},
					b.prototype.currentSrc = function () {
						return this.currentSource_ ? this.currentSource_.src : this.el_.currentSrc
					},
					b.prototype.poster = function () {
						return this.el_.poster
					},
					b.prototype.setPoster = function (a) {
						this.el_.poster = a
					},
					b.prototype.preload = function () {
						return this.el_.preload
					},
					b.prototype.setPreload = function (a) {
						this.el_.preload = a
					},
					b.prototype.autoplay = function () {
						return this.el_.autoplay
					},
					b.prototype.setAutoplay = function (a) {
						this.el_.autoplay = a
					},
					b.prototype.controls = function () {
						return this.el_.controls
					},
					b.prototype.setControls = function (a) {
						this.el_.controls = !!a
					},
					b.prototype.loop = function () {
						return this.el_.loop
					},
					b.prototype.setLoop = function (a) {
						this.el_.loop = a
					},
					b.prototype.error = function () {
						return this.el_.error
					},
					b.prototype.seeking = function () {
						return this.el_.seeking
					},
					b.prototype.seekable = function () {
						return this.el_.seekable
					},
					b.prototype.ended = function () {
						return this.el_.ended
					},
					b.prototype.defaultMuted = function () {
						return this.el_.defaultMuted
					},
					b.prototype.playbackRate = function () {
						return this.el_.playbackRate
					},
					b.prototype.played = function () {
						return this.el_.played
					},
					b.prototype.setPlaybackRate = function (a) {
						this.el_.playbackRate = a
					},
					b.prototype.networkState = function () {
						return this.el_.networkState
					},
					b.prototype.readyState = function () {
						return this.el_.readyState
					},
					b.prototype.videoWidth = function () {
						return this.el_.videoWidth
					},
					b.prototype.videoHeight = function () {
						return this.el_.videoHeight
					},
					b.prototype.textTracks = function () {
						return a.prototype.textTracks.call(this)
					},
					b.prototype.addTextTrack = function (b, c, d) {
						return this.featuresNativeTextTracks ? this.el_.addTextTrack(b, c, d) : a.prototype.addTextTrack.call(this, b, c, d)
					},
					b.prototype.addRemoteTextTrack = function () {
						var b = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0];
						if (!this.featuresNativeTextTracks)
							return a.prototype.addRemoteTextTrack.call(this, b);
						var c = B["default"].createElement("track");
						return b.kind && (c.kind = b.kind),
						b.label && (c.label = b.label),
						(b.language || b.srclang) && (c.srclang = b.language || b.srclang),
						b["default"] && (c["default"] = b["default"]),
						b.id && (c.id = b.id),
						b.src && (c.src = b.src),
						this.el().appendChild(c),
						this.remoteTextTrackEls().addTrackElement_(c),
						this.remoteTextTracks().addTrack_(c.track),
						c
					},
					b.prototype.removeRemoteTextTrack = function (b) {
						if (!this.featuresNativeTextTracks)
							return a.prototype.removeRemoteTextTrack.call(this, b);
						var c = void 0,
						d = void 0,
						e = this.remoteTextTrackEls().getTrackElementByTrack_(b);
						for (this.remoteTextTrackEls().removeTrackElement_(e), this.remoteTextTracks().removeTrack_(b), c = this.$$("track"), d = c.length; d--; )
							(b === c[d] || b === c[d].track) && this.el().removeChild(c[d])
					},
					b
				}
				(k["default"]);
				K.TEST_VID = B["default"].createElement("video");
				var L = B["default"].createElement("track");
				L.kind = "captions",
				L.srclang = "en",
				L.label = "English",
				K.TEST_VID.appendChild(L),
				K.isSupported = function () {
					try {
						K.TEST_VID.volume = .5
					} catch (a) {
						return !1
					}
					return !!K.TEST_VID.canPlayType
				},
				k["default"].withSourceHandlers(K),
				K.nativeSourceHandler = {},
				K.nativeSourceHandler.canPlayType = function (a) {
					try {
						return K.TEST_VID.canPlayType(a)
					} catch (b) {
						return ""
					}
				},
				K.nativeSourceHandler.canHandleSource = function (a) {
					var b;
					return a.type ? K.nativeSourceHandler.canPlayType(a.type) : a.src ? (b = q.getFileExtension(a.src), K.nativeSourceHandler.canPlayType("video/" + b)) : ""
				},
				K.nativeSourceHandler.handleSource = function (a, b) {
					b.setSrc(a.src)
				},
				K.nativeSourceHandler.dispose = function () {},
				K.registerSourceHandler(K.nativeSourceHandler),
				K.canControlVolume = function () {
					try {
						var a = K.TEST_VID.volume;
						return K.TEST_VID.volume = a / 2 + .1,
						a !== K.TEST_VID.volume
					} catch (b) {
						return !1
					}
				},
				K.canControlPlaybackRate = function () {
					if (z.IS_ANDROID && z.IS_CHROME)
						return !1;
					try {
						var a = K.TEST_VID.playbackRate;
						return K.TEST_VID.playbackRate = a / 2 + .1,
						a !== K.TEST_VID.playbackRate
					} catch (b) {
						return !1
					}
				},
				K.supportsNativeTextTracks = function () {
					var a;
					return a = !!K.TEST_VID.textTracks,
					a && K.TEST_VID.textTracks.length > 0 && (a = "number" != typeof K.TEST_VID.textTracks[0].mode),
					a && z.IS_FIREFOX && (a = !1),
					!a || "onremovetrack" in K.TEST_VID.textTracks || (a = !1),
					a
				},
				K.supportsNativeVideoTracks = function () {
					var a = !!K.TEST_VID.videoTracks;
					return a
				},
				K.supportsNativeAudioTracks = function () {
					var a = !!K.TEST_VID.audioTracks;
					return a
				},
				K.Events = ["loadstart", "suspend", "abort", "error", "emptied", "stalled", "loadedmetadata", "loadeddata", "canplay", "canplaythrough", "playing", "waiting", "seeking", "seeked", "ended", "durationchange", "timeupdate", "progress", "play", "pause", "ratechange", "volumechange"],
				K.prototype.featuresVolumeControl = K.canControlVolume(),
				K.prototype.featuresPlaybackRate = K.canControlPlaybackRate(),
				K.prototype.movingMediaElementInDOM = !z.IS_IOS,
				K.prototype.featuresFullscreenResize = !0,
				K.prototype.featuresProgressEvents = !0,
				K.prototype.featuresNativeTextTracks = K.supportsNativeTextTracks(),
				K.prototype.featuresNativeVideoTracks = K.supportsNativeVideoTracks(),
				K.prototype.featuresNativeAudioTracks = K.supportsNativeAudioTracks();
				var M = void 0,
				N = /^application\/(?:x-|vnd\.apple\.)mpegurl/i,
				O = /^video\/mp4/i;
				K.patchCanPlayType = function () {
					z.ANDROID_VERSION >= 4 && (M || (M = K.TEST_VID.constructor.prototype.canPlayType), K.TEST_VID.constructor.prototype.canPlayType = function (a) {
						return a && N.test(a) ? "maybe" : M.call(this, a)
					}),
					z.IS_OLD_ANDROID && (M || (M = K.TEST_VID.constructor.prototype.canPlayType), K.TEST_VID.constructor.prototype.canPlayType = function (a) {
						return a && O.test(a) ? "maybe" : M.call(this, a)
					})
				},
				K.unpatchCanPlayType = function () {
					var a = K.TEST_VID.constructor.prototype.canPlayType;
					return K.TEST_VID.constructor.prototype.canPlayType = M,
					M = null,
					a
				},
				K.patchCanPlayType(),
				K.disposeMediaElement = function (a) {
					if (a) {
						for (a.parentNode && a.parentNode.removeChild(a); a.hasChildNodes(); )
							a.removeChild(a.firstChild);
						a.removeAttribute("src"),
						"function" == typeof a.load && !function () {
							try {
								a.load()
							} catch (b) {}
						}
						()
					}
				},
				K.resetMediaElement = function (a) {
					if (a) {
						for (var b = a.querySelectorAll("source"), c = b.length; c--; )
							a.removeChild(b[c]);
						a.removeAttribute("src"),
						"function" == typeof a.load && !function () {
							try {
								a.load()
							} catch (b) {}
						}
						()
					}
				},
				m["default"].registerComponent("Html5", K),
				k["default"].registerTech("Html5", K),
				c["default"] = K,
				b.exports = c["default"]
			}, {
				"../../../src/js/tracks/text-track.js": 134,
				"../component": 67,
				"../utils/browser.js": 140,
				"../utils/dom.js": 143,
				"../utils/fn.js": 145,
				"../utils/log.js": 148,
				"../utils/merge-options.js": 149,
				"../utils/to-title-case.js": 152,
				"../utils/url.js": 153,
				"./tech.js": 124,
				"global/document": 1,
				"global/window": 2,
				"object.assign": 45,
				tsml: 55
			}
		],
		123: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function f(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var g = a("../component.js"),
				h = d(g),
				i = a("./tech.js"),
				j = d(i),
				k = a("global/window"),
				l = (d(k), a("../utils/to-title-case.js")),
				m = d(l),
				n = function (a) {
					function b(c, d, f) {
						if (e(this, b), a.call(this, c, d, f), d.playerOptions.sources && 0 !== d.playerOptions.sources.length)
							c.src(d.playerOptions.sources);
						else
							for (var g = 0, i = d.playerOptions.techOrder; g < i.length; g++) {
								var k = m["default"](i[g]),
								l = j["default"].getTech(k);
								if (k || (l = h["default"].getComponent(k)), l && l.isSupported()) {
									c.loadTech_(k);
									break
								}
							}
					}
					return f(b, a),
					b
				}
				(h["default"]);
				h["default"].registerComponent("MediaLoader", n),
				c["default"] = n,
				b.exports = c["default"]
			}, {
				"../component.js": 67,
				"../utils/to-title-case.js": 152,
				"./tech.js": 124,
				"global/window": 2
			}
		],
		124: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../component"),
				i = e(h),
				j = a("../tracks/html-track-element"),
				k = e(j),
				l = a("../tracks/html-track-element-list"),
				m = e(l),
				n = a("../utils/merge-options.js"),
				o = e(n),
				p = a("../tracks/text-track"),
				q = e(p),
				r = a("../tracks/text-track-list"),
				s = e(r),
				t = a("../tracks/video-track"),
				u = (e(t), a("../tracks/video-track-list")),
				v = e(u),
				w = a("../tracks/audio-track-list"),
				x = e(w),
				y = a("../tracks/audio-track"),
				z = (e(y), a("../utils/fn.js")),
				A = d(z),
				B = a("../utils/log.js"),
				C = e(B),
				D = a("../utils/time-ranges.js"),
				E = a("../utils/buffer.js"),
				F = a("../media-error.js"),
				G = e(F),
				H = a("global/window"),
				I = e(H),
				J = a("global/document"),
				K = e(J),
				L = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0],
						d = arguments.length <= 1 || void 0 === arguments[1] ? function () {}
						 : arguments[1];
						f(this, b),
						c.reportTouchActivity = !1,
						a.call(this, null, c, d),
						this.hasStarted_ = !1,
						this.on("playing", function () {
							this.hasStarted_ = !0
						}),
						this.on("loadstart", function () {
							this.hasStarted_ = !1
						}),
						this.textTracks_ = c.textTracks,
						this.videoTracks_ = c.videoTracks,
						this.audioTracks_ = c.audioTracks,
						this.featuresProgressEvents || this.manualProgressOn(),
						this.featuresTimeupdateEvents || this.manualTimeUpdatesOn(),
						(c.nativeCaptions === !1 || c.nativeTextTracks === !1) && (this.featuresNativeTextTracks = !1),
						this.featuresNativeTextTracks || this.on("ready", this.emulateTextTracks),
						this.initTextTrackListeners(),
						this.initTrackListeners(),
						this.emitTapEvents()
					} /*! Time Tracking -------------------------------------------------------------- */
					return g(b, a),
					b.prototype.manualProgressOn = function () {
						this.on("durationchange", this.onDurationChange),
						this.manualProgress = !0,
						this.one("ready", this.trackProgress)
					},
					b.prototype.manualProgressOff = function () {
						this.manualProgress = !1,
						this.stopTrackingProgress(),
						this.off("durationchange", this.onDurationChange)
					},
					b.prototype.trackProgress = function () {
						this.stopTrackingProgress(),
						this.progressInterval = this.setInterval(A.bind(this, function () {
									var a = this.bufferedPercent();
									this.bufferedPercent_ !== a && this.trigger("progress"),
									this.bufferedPercent_ = a,
									1 === a && this.stopTrackingProgress()
								}), 500)
					},
					b.prototype.onDurationChange = function () {
						this.duration_ = this.duration()
					},
					b.prototype.buffered = function () {
						return D.createTimeRange(0, 0)
					},
					b.prototype.bufferedPercent = function () {
						return E.bufferedPercent(this.buffered(), this.duration_)
					},
					b.prototype.stopTrackingProgress = function () {
						this.clearInterval(this.progressInterval)
					},
					b.prototype.manualTimeUpdatesOn = function () {
						this.manualTimeUpdates = !0,
						this.on("play", this.trackCurrentTime),
						this.on("pause", this.stopTrackingCurrentTime)
					},
					b.prototype.manualTimeUpdatesOff = function () {
						this.manualTimeUpdates = !1,
						this.stopTrackingCurrentTime(),
						this.off("play", this.trackCurrentTime),
						this.off("pause", this.stopTrackingCurrentTime)
					},
					b.prototype.trackCurrentTime = function () {
						this.currentTimeInterval && this.stopTrackingCurrentTime(),
						this.currentTimeInterval = this.setInterval(function () {
								this.trigger({
									type: "timeupdate",
									target: this,
									manuallyTriggered: !0
								})
							}, 250)
					},
					b.prototype.stopTrackingCurrentTime = function () {
						this.clearInterval(this.currentTimeInterval),
						this.trigger({
							type: "timeupdate",
							target: this,
							manuallyTriggered: !0
						})
					},
					b.prototype.dispose = function () {
						this.clearTracks(["audio", "video", "text"]),
						this.manualProgress && this.manualProgressOff(),
						this.manualTimeUpdates && this.manualTimeUpdatesOff(),
						a.prototype.dispose.call(this)
					},
					b.prototype.clearTracks = function (a) {
						var b = this;
						a = [].concat(a),
						a.forEach(function (a) {
							for (var c = b[a + "Tracks"]() || [], d = c.length; d--; ) {
								var e = c[d];
								"text" === a && b.removeRemoteTextTrack(e),
								c.removeTrack_(e)
							}
						})
					},
					b.prototype.reset = function () {},
					b.prototype.error = function (a) {
						return void 0 !== a && (this.error_ = a instanceof G["default"] ? a : new G["default"](a), this.trigger("error")),
						this.error_
					},
					b.prototype.played = function () {
						return this.hasStarted_ ? D.createTimeRange(0, 0) : D.createTimeRange()
					},
					b.prototype.setCurrentTime = function () {
						this.manualTimeUpdates && this.trigger({
							type: "timeupdate",
							target: this,
							manuallyTriggered: !0
						})
					},
					b.prototype.initTextTrackListeners = function () {
						var a = A.bind(this, function () {
								this.trigger("texttrackchange")
							}),
						b = this.textTracks();
						b && (b.addEventListener("removetrack", a), b.addEventListener("addtrack", a), this.on("dispose", A.bind(this, function () {
									b.removeEventListener("removetrack", a),
									b.removeEventListener("addtrack", a)
								})))
					},
					b.prototype.initTrackListeners = function () {
						var a = this,
						b = ["video", "audio"];
						b.forEach(function (b) {
							var c = function () {
								a.trigger(b + "trackchange")
							},
							d = a[b + "Tracks"]();
							d.addEventListener("removetrack", c),
							d.addEventListener("addtrack", c),
							a.on("dispose", function () {
								d.removeEventListener("removetrack", c),
								d.removeEventListener("addtrack", c)
							})
						})
					},
					b.prototype.emulateTextTracks = function () {
						var a = this,
						b = this.textTracks();
						if (b) {
							I["default"].WebVTT || null == this.el().parentNode || !function () {
								var b = K["default"].createElement("script");
								b.src = a.options_["vtt.js"] || "https://cdn.rawgit.com/gkatsev/vtt.js/vjs-v0.12.1/dist/vtt.min.js",
								b.onload = function () {
									a.trigger("vttjsloaded")
								},
								b.onerror = function () {
									a.trigger("vttjserror")
								},
								a.on("dispose", function () {
									b.onload = null,
									b.onerror = null
								}),
								I["default"].WebVTT = !0,
								a.el().parentNode.appendChild(b)
							}
							();
							var c = function () {
								return a.trigger("texttrackchange")
							},
							d = function () {
								c();
								for (var a = 0; a < b.length; a++) {
									var d = b[a];
									d.removeEventListener("cuechange", c),
									"showing" === d.mode && d.addEventListener("cuechange", c)
								}
							};
							d(),
							b.addEventListener("change", d),
							this.on("dispose", function () {
								b.removeEventListener("change", d)
							})
						}
					},
					b.prototype.videoTracks = function () {
						return this.videoTracks_ = this.videoTracks_ || new v["default"],
						this.videoTracks_
					},
					b.prototype.audioTracks = function () {
						return this.audioTracks_ = this.audioTracks_ || new x["default"],
						this.audioTracks_
					},
					b.prototype.textTracks = function () {
						return this.textTracks_ = this.textTracks_ || new s["default"],
						this.textTracks_
					},
					b.prototype.remoteTextTracks = function () {
						return this.remoteTextTracks_ = this.remoteTextTracks_ || new s["default"],
						this.remoteTextTracks_
					},
					b.prototype.remoteTextTrackEls = function () {
						return this.remoteTextTrackEls_ = this.remoteTextTrackEls_ || new m["default"],
						this.remoteTextTrackEls_
					},
					b.prototype.addTextTrack = function (a, b, c) {
						if (!a)
							throw new Error("TextTrack kind is required but was not provided");
						return M(this, a, b, c)
					},
					b.prototype.addRemoteTextTrack = function (a) {
						var b = o["default"](a, {
								tech: this
							}),
						c = new k["default"](b);
						return this.remoteTextTrackEls().addTrackElement_(c),
						this.remoteTextTracks().addTrack_(c.track),
						this.textTracks().addTrack_(c.track),
						c
					},
					b.prototype.removeRemoteTextTrack = function (a) {
						this.textTracks().removeTrack_(a);
						var b = this.remoteTextTrackEls().getTrackElementByTrack_(a);
						this.remoteTextTrackEls().removeTrackElement_(b),
						this.remoteTextTracks().removeTrack_(a)
					},
					b.prototype.setPoster = function () {},
					b.prototype.canPlayType = function () {
						return ""
					},
					b.isTech = function (a) {
						return a.prototype instanceof b || a instanceof b || a === b
					},
					b.registerTech = function (a, c) {
						if (b.techs_ || (b.techs_ = {}), !b.isTech(c))
							throw new Error("Tech " + a + " must be a Tech");
						return b.techs_[a] = c,
						c
					},
					b.getTech = function (a) {
						return b.techs_ && b.techs_[a] ? b.techs_[a] : I["default"] && I["default"].videojs && I["default"].videojs[a] ? (C["default"].warn("The " + a + " tech was added to the videojs object when it should be registered using videojs.registerTech(name, tech)"), I["default"].videojs[a]) : void 0
					},
					b
				}
				(i["default"]);
				L.prototype.textTracks_,
				L.prototype.audioTracks_,
				L.prototype.videoTracks_;
				var M = function (a, b, c, d) {
					var e = arguments.length <= 4 || void 0 === arguments[4] ? {}
					 : arguments[4],
					f = a.textTracks();
					e.kind = b,
					c && (e.label = c),
					d && (e.language = d),
					e.tech = a;
					var g = new q["default"](e);
					return f.addTrack_(g),
					g
				};
				L.prototype.featuresVolumeControl = !0,
				L.prototype.featuresFullscreenResize = !1,
				L.prototype.featuresPlaybackRate = !1,
				L.prototype.featuresProgressEvents = !1,
				L.prototype.featuresTimeupdateEvents = !1,
				L.prototype.featuresNativeTextTracks = !1,
				L.withSourceHandlers = function (a) {
					a.registerSourceHandler = function (b, c) {
						var d = a.sourceHandlers;
						d || (d = a.sourceHandlers = []),
						void 0 === c && (c = d.length),
						d.splice(c, 0, b)
					},
					a.canPlayType = function (b) {
						for (var c = a.sourceHandlers || [], d = void 0, e = 0; e < c.length; e++)
							if (d = c[e].canPlayType(b))
								return d;
						return ""
					},
					a.selectSourceHandler = function (b) {
						for (var c = a.sourceHandlers || [], d = void 0, e = 0; e < c.length; e++)
							if (d = c[e].canHandleSource(b))
								return c[e];
						return null
					},
					a.canPlaySource = function (b) {
						var c = a.selectSourceHandler(b);
						return c ? c.canHandleSource(b) : ""
					};
					var b = ["seekable", "duration"];
					b.forEach(function (a) {
						var b = this[a];
						"function" == typeof b && (this[a] = function () {
							return this.sourceHandler_ && this.sourceHandler_[a] ? this.sourceHandler_[a].apply(this.sourceHandler_, arguments) : b.apply(this, arguments)
						})
					}, a.prototype),
					a.prototype.setSource = function (b) {
						var c = a.selectSourceHandler(b);
						return c || (a.nativeSourceHandler ? c = a.nativeSourceHandler : C["default"].error("No source hander found for the current source.")),
						this.disposeSourceHandler(),
						this.off("dispose", this.disposeSourceHandler),
						this.currentSource_ && (this.clearTracks(["audio", "video"]), this.currentSource_ = null),
						c !== a.nativeSourceHandler && (this.currentSource_ = b, this.off(this.el_, "loadstart", a.prototype.firstLoadStartListener_), this.off(this.el_, "loadstart", a.prototype.successiveLoadStartListener_), this.one(this.el_, "loadstart", a.prototype.firstLoadStartListener_)),
						this.sourceHandler_ = c.handleSource(b, this, this.options_),
						this.on("dispose", this.disposeSourceHandler),
						this
					},
					a.prototype.firstLoadStartListener_ = function () {
						this.one(this.el_, "loadstart", a.prototype.successiveLoadStartListener_)
					},
					a.prototype.successiveLoadStartListener_ = function () {
						this.currentSource_ = null,
						this.disposeSourceHandler(),
						this.one(this.el_, "loadstart", a.prototype.successiveLoadStartListener_)
					},
					a.prototype.disposeSourceHandler = function () {
						this.sourceHandler_ && this.sourceHandler_.dispose && (this.off(this.el_, "loadstart", a.prototype.firstLoadStartListener_), this.off(this.el_, "loadstart", a.prototype.successiveLoadStartListener_), this.sourceHandler_.dispose(), this.sourceHandler_ = null)
					}
				},
				i["default"].registerComponent("Tech", L),
				i["default"].registerComponent("MediaTechController", L),
				L.registerTech("Tech", L),
				c["default"] = L,
				b.exports = c["default"]
			}, {
				"../component": 67,
				"../media-error.js": 108,
				"../tracks/audio-track": 126,
				"../tracks/audio-track-list": 125,
				"../tracks/html-track-element": 128,
				"../tracks/html-track-element-list": 127,
				"../tracks/text-track": 134,
				"../tracks/text-track-list": 132,
				"../tracks/video-track": 139,
				"../tracks/video-track-list": 138,
				"../utils/buffer.js": 141,
				"../utils/fn.js": 145,
				"../utils/log.js": 148,
				"../utils/merge-options.js": 149,
				"../utils/time-ranges.js": 151,
				"global/document": 1,
				"global/window": 2
			}
		],
		125: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./track-list"),
				i = e(h),
				j = a("../utils/browser.js"),
				k = d(j),
				l = a("global/document"),
				m = e(l),
				n = function (a, b) {
					for (var c = 0; c < a.length; c++)
						b.id !== a[c].id && (a[c].enabled = !1)
				},
				o = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? [] : arguments[0];
						f(this, b);
						for (var d = void 0, e = c.length - 1; e >= 0; e--)
							if (c[e].enabled) {
								n(c, c[e]);
								break
							}
						if (k.IS_IE8) {
							d = m["default"].createElement("custom");
							for (var g in i["default"].prototype)
								"constructor" !== g && (d[g] = i["default"].prototype[g]);
							for (var g in b.prototype)
								"constructor" !== g && (d[g] = b.prototype[g])
						}
						return d = a.call(this, c, d),
						d.changing_ = !1,
						d
					}
					return g(b, a),
					b.prototype.addTrack_ = function (b) {
						var c = this;
						b.enabled && n(this, b),
						a.prototype.addTrack_.call(this, b),
						b.addEventListener && b.addEventListener("enabledchange", function () {
							c.changing_ || (c.changing_ = !0, n(c, b), c.changing_ = !1, c.trigger("change"))
						})
					},
					b.prototype.addTrack = function (a) {
						this.addTrack_(a)
					},
					b.prototype.removeTrack = function (b) {
						a.prototype.removeTrack_.call(this, b)
					},
					b
				}
				(i["default"]);
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"./track-list": 136,
				"global/document": 1
			}
		],
		126: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./track-enums"),
				i = a("./track"),
				j = e(i),
				k = a("../utils/merge-options"),
				l = e(k),
				m = a("../utils/browser.js"),
				n = d(m),
				o = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0];
						f(this, b);
						var d = l["default"](c, {
								kind: h.AudioTrackKind[c.kind] || ""
							}),
						e = a.call(this, d),
						g = !1;
						if (n.IS_IE8)
							for (var i in b.prototype)
								"constructor" !== i && (e[i] = b.prototype[i]);
						return Object.defineProperty(e, "enabled", {
							get: function () {
								return g
							},
							set: function (a) {
								"boolean" == typeof a && a !== g && (g = a, this.trigger("enabledchange"))
							}
						}),
						d.enabled && (e.enabled = d.enabled),
						e.loaded_ = !0,
						e
					}
					return g(b, a),
					b
				}
				(j["default"]);
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"../utils/merge-options": 149,
				"./track": 137,
				"./track-enums": 135
			}
		],
		127: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				c.__esModule = !0;
				var g = a("../utils/browser.js"),
				h = e(g),
				i = a("global/document"),
				j = d(i),
				k = function () {
					function a() {
						var b = arguments.length <= 0 || void 0 === arguments[0] ? [] : arguments[0];
						f(this, a);
						var c = this;
						if (h.IS_IE8) {
							c = j["default"].createElement("custom");
							for (var d in a.prototype)
								"constructor" !== d && (c[d] = a.prototype[d])
						}
						c.trackElements_ = [],
						Object.defineProperty(c, "length", {
							get: function () {
								return this.trackElements_.length
							}
						});
						for (var e = 0, g = b.length; g > e; e++)
							c.addTrackElement_(b[e]);
						return h.IS_IE8 ? c : void 0
					}
					return a.prototype.addTrackElement_ = function (a) {
						this.trackElements_.push(a)
					},
					a.prototype.getTrackElementByTrack_ = function (a) {
						for (var b = void 0, c = 0, d = this.trackElements_.length; d > c; c++)
							if (a === this.trackElements_[c].track) {
								b = this.trackElements_[c];
								break
							}
						return b
					},
					a.prototype.removeTrackElement_ = function (a) {
						for (var b = 0, c = this.trackElements_.length; c > b; b++)
							if (a === this.trackElements_[b]) {
								this.trackElements_.splice(b, 1);
								break
							}
					},
					a
				}
				();
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"global/document": 1
			}
		],
		128: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../utils/browser.js"),
				i = e(h),
				j = a("global/document"),
				k = d(j),
				l = a("../event-target"),
				m = d(l),
				n = a("../tracks/text-track"),
				o = d(n),
				p = 0,
				q = 1,
				r = 2,
				s = 3,
				t = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0];
						f(this, b),
						a.call(this);
						var d = void 0,
						e = this;
						if (i.IS_IE8) {
							e = k["default"].createElement("custom");
							for (var g in b.prototype)
								"constructor" !== g && (e[g] = b.prototype[g])
						}
						var h = new o["default"](c);
						return e.kind = h.kind,
						e.src = h.src,
						e.srclang = h.language,
						e.label = h.label,
						e["default"] = h["default"],
						Object.defineProperty(e, "readyState", {
							get: function () {
								return d
							}
						}),
						Object.defineProperty(e, "track", {
							get: function () {
								return h
							}
						}),
						d = p,
						h.addEventListener("loadeddata", function () {
							d = r,
							e.trigger({
								type: "load",
								target: e
							})
						}),
						i.IS_IE8 ? e : void 0
					}
					return g(b, a),
					b
				}
				(m["default"]);
				t.prototype.allowedEvents_ = {
					load: "load"
				},
				t.NONE = p,
				t.LOADING = q,
				t.LOADED = r,
				t.ERROR = s,
				c["default"] = t,
				b.exports = c["default"]
			}, {
				"../event-target": 104,
				"../tracks/text-track": 134,
				"../utils/browser.js": 140,
				"global/document": 1
			}
		],
		129: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				c.__esModule = !0;
				var g = a("../utils/browser.js"),
				h = e(g),
				i = a("global/document"),
				j = d(i),
				k = function () {
					function a(b) {
						f(this, a);
						var c = this;
						if (h.IS_IE8) {
							c = j["default"].createElement("custom");
							for (var d in a.prototype)
								"constructor" !== d && (c[d] = a.prototype[d])
						}
						return a.prototype.setCues_.call(c, b),
						Object.defineProperty(c, "length", {
							get: function () {
								return this.length_
							}
						}),
						h.IS_IE8 ? c : void 0
					}
					return a.prototype.setCues_ = function (a) {
						var b = this.length || 0,
						c = 0,
						d = a.length;
						this.cues_ = a,
						this.length_ = a.length;
						var e = function (a) {
							"" + a in this || Object.defineProperty(this, "" + a, {
								get: function () {
									return this.cues_[a]
								}
							})
						};
						if (d > b)
							for (c = b; d > c; c++)
								e.call(this, c)
					},
					a.prototype.getCueById = function (a) {
						for (var b = null, c = 0, d = this.length; d > c; c++) {
							var e = this[c];
							if (e.id === a) {
								b = e;
								break
							}
						}
						return b
					},
					a
				}
				();
				c["default"] = k,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"global/document": 1
			}
		],
		130: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				function h(a, b) {
					return "rgba(" + parseInt(a[1] + a[1], 16) + "," + parseInt(a[2] + a[2], 16) + "," + parseInt(a[3] + a[3], 16) + "," + b + ")"
				}
				function i(a, b, c) {
					try {
						a.style[b] = c
					} catch (d) {}
				}
				c.__esModule = !0;
				var j = a("../component"),
				k = e(j),
				l = a("../menu/menu.js"),
				m = (e(l), a("../menu/menu-item.js")),
				n = (e(m), a("../menu/menu-button.js")),
				o = (e(n), a("../utils/fn.js")),
				p = d(o),
				q = a("global/document"),
				r = (e(q), a("global/window")),
				s = e(r),
				t = "#222",
				u = "#ccc",
				v = {
					monospace: "monospace",
					sansSerif: "sans-serif",
					serif: "serif",
					monospaceSansSerif: '"Andale Mono", "Lucida Console", monospace',
					monospaceSerif: '"Courier New", monospace',
					proportionalSansSerif: "sans-serif",
					proportionalSerif: "serif",
					casual: '"Comic Sans MS", Impact, fantasy',
					script: '"Monotype Corsiva", cursive',
					smallcaps: '"Andale Mono", "Lucida Console", monospace, sans-serif'
				},
				w = function (a) {
					function b(c, d, e) {
						f(this, b),
						a.call(this, c, d, e),
						c.on("loadstart", p.bind(this, this.toggleDisplay)),
						c.on("texttrackchange", p.bind(this, this.updateDisplay)),
						c.ready(p.bind(this, function () {
								if (c.tech_ && c.tech_.featuresNativeTextTracks)
									return void this.hide();
								c.on("fullscreenchange", p.bind(this, this.updateDisplay));
								for (var a = this.options_.playerOptions.tracks || [], b = 0; b < a.length; b++) {
									var d = a[b];
									this.player_.addRemoteTextTrack(d)
								}
								var e = {
									captions: 1,
									subtitles: 1
								},
								f = this.player_.textTracks(),
								g = void 0,
								h = void 0;
								if (f) {
									for (var b = 0; b < f.length; b++) {
										var d = f[b];
										d["default"] && ("descriptions" !== d.kind || g ? d.kind in e && !h && (h = d) : g = d)
									}
									h ? h.mode = "showing" : g && (g.mode = "showing")
								}
							}))
					}
					return g(b, a),
					b.prototype.toggleDisplay = function () {
						this.player_.tech_ && this.player_.tech_.featuresNativeTextTracks ? this.hide() : this.show()
					},
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-text-track-display"
						}, {
							"aria-live": "assertive",
							"aria-atomic": "true"
						})
					},
					b.prototype.clearDisplay = function () {
						"function" == typeof s["default"].WebVTT && s["default"].WebVTT.processCues(s["default"], [], this.el_)
					},
					b.prototype.updateDisplay = function () {
						var a = this.player_.textTracks();
						if (this.clearDisplay(), a) {
							for (var b = null, c = null, d = a.length; d--; ) {
								var e = a[d];
								"showing" === e.mode && ("descriptions" === e.kind ? b = e : c = e)
							}
							c ? this.updateForTrack(c) : b && this.updateForTrack(b)
						}
					},
					b.prototype.updateForTrack = function (a) {
						if ("function" == typeof s["default"].WebVTT && a.activeCues) {
							for (var b = this.player_.textTrackSettings.getValues(), c = [], d = 0; d < a.activeCues.length; d++)
								c.push(a.activeCues[d]);
							s["default"].WebVTT.processCues(s["default"], c, this.el_);
							for (var e = c.length; e--; ) {
								var f = c[e];
								if (f) {
									var g = f.displayState;
									if (b.color && (g.firstChild.style.color = b.color), b.textOpacity && i(g.firstChild, "color", h(b.color || "#fff", b.textOpacity)), b.backgroundColor && (g.firstChild.style.backgroundColor = b.backgroundColor), b.backgroundOpacity && i(g.firstChild, "backgroundColor", h(b.backgroundColor || "#000", b.backgroundOpacity)), b.windowColor && (b.windowOpacity ? i(g, "backgroundColor", h(b.windowColor, b.windowOpacity)) : g.style.backgroundColor = b.windowColor), b.edgeStyle && ("dropshadow" === b.edgeStyle ? g.firstChild.style.textShadow = "2px 2px 3px " + t + ", 2px 2px 4px " + t + ", 2px 2px 5px " + t : "raised" === b.edgeStyle ? g.firstChild.style.textShadow = "1px 1px " + t + ", 2px 2px " + t + ", 3px 3px " + t : "depressed" === b.edgeStyle ? g.firstChild.style.textShadow = "1px 1px " + u + ", 0 1px " + u + ", -1px -1px " + t + ", 0 -1px " + t : "uniform" === b.edgeStyle && (g.firstChild.style.textShadow = "0 0 4px " + t + ", 0 0 4px " + t + ", 0 0 4px " + t + ", 0 0 4px " + t)), b.fontPercent && 1 !== b.fontPercent) {
										var j = s["default"].parseFloat(g.style.fontSize);
										g.style.fontSize = j * b.fontPercent + "px",
										g.style.height = "auto",
										g.style.top = "auto",
										g.style.bottom = "2px"
									}
									b.fontFamily && "default" !== b.fontFamily && ("small-caps" === b.fontFamily ? g.firstChild.style.fontVariant = "small-caps" : g.firstChild.style.fontFamily = v[b.fontFamily])
								}
							}
						}
					},
					b
				}
				(k["default"]);
				k["default"].registerComponent("TextTrackDisplay", w),
				c["default"] = w,
				b.exports = c["default"]
			}, {
				"../component": 67,
				"../menu/menu-button.js": 109,
				"../menu/menu-item.js": 110,
				"../menu/menu.js": 111,
				"../utils/fn.js": 145,
				"global/document": 1,
				"global/window": 2
			}
		],
		131: [function (a, b, c) {
				"use strict";
				c.__esModule = !0;
				var d = function (a) {
					var b = ["kind", "label", "language", "id", "inBandMetadataTrackDispatchType", "mode", "src"].reduce(function (b, c) {
						return a[c] && (b[c] = a[c]),
						b
					}, {
						cues: a.cues && Array.prototype.map.call(a.cues, function (a) {
							return {
								startTime: a.startTime,
								endTime: a.endTime,
								text: a.text,
								id: a.id
							}
						})
					});
					return b
				},
				e = function (a) {
					var b = a.$$("track"),
					c = Array.prototype.map.call(b, function (a) {
							return a.track
						}),
					e = Array.prototype.map.call(b, function (a) {
							var b = d(a.track);
							return a.src && (b.src = a.src),
							b
						});
					return e.concat(Array.prototype.filter.call(a.textTracks(), function (a) {
							return -1 === c.indexOf(a)
						}).map(d))
				},
				f = function (a, b) {
					return a.forEach(function (a) {
						var c = b.addRemoteTextTrack(a).track;
						!a.src && a.cues && a.cues.forEach(function (a) {
							return c.addCue(a)
						})
					}),
					b.textTracks()
				};
				c["default"] = {
					textTracksToJson: e,
					jsonToTextTracks: f,
					trackToJson_: d
				},
				b.exports = c["default"]
			}, {}
		],
		132: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./track-list"),
				i = e(h),
				j = a("../utils/fn.js"),
				k = d(j),
				l = a("../utils/browser.js"),
				m = d(l),
				n = a("global/document"),
				o = e(n),
				p = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? [] : arguments[0];
						f(this, b);
						var d = void 0;
						if (m.IS_IE8) {
							d = o["default"].createElement("custom");
							for (var e in i["default"].prototype)
								"constructor" !== e && (d[e] = i["default"].prototype[e]);
							for (var e in b.prototype)
								"constructor" !== e && (d[e] = b.prototype[e])
						}
						return d = a.call(this, c, d)
					}
					return g(b, a),
					b.prototype.addTrack_ = function (b) {
						a.prototype.addTrack_.call(this, b),
						b.addEventListener("modechange", k.bind(this, function () {
								this.trigger("change")
							}))
					},
					b.prototype.removeTrack_ = function (a) {
						for (var b = void 0, c = 0, d = this.length; d > c; c++)
							if (this[c] === a) {
								b = this[c],
								b.off && b.off(),
								this.tracks_.splice(c, 1);
								break
							}
						b && this.trigger({
							track: b,
							type: "removetrack"
						})
					},
					b.prototype.getTrackById = function (a) {
						for (var b = null, c = 0, d = this.length; d > c; c++) {
							var e = this[c];
							if (e.id === a) {
								b = e;
								break
							}
						}
						return b
					},
					b
				}
				(i["default"]);
				c["default"] = p,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"../utils/fn.js": 145,
				"./track-list": 136,
				"global/document": 1
			}
		],
		133: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				function h(a) {
					var b = void 0;
					return a.selectedOptions ? b = a.selectedOptions[0] : a.options && (b = a.options[a.options.selectedIndex]),
					b.value
				}
				function i(a, b) {
					if (b) {
						var c = void 0;
						for (c = 0; c < a.options.length; c++) {
							var d = a.options[c];
							if (d.value === b)
								break
						}
						a.selectedIndex = c
					}
				}
				function j() {
					var a = '<div class="vjs-tracksettings">\n      <div class="vjs-tracksettings-colors">\n        <div class="vjs-fg-color vjs-tracksetting">\n            <label class="vjs-label">Foreground</label>\n            <select>\n              <option value="">---</option>\n              <option value="#FFF">White</option>\n              <option value="#000">Black</option>\n              <option value="#F00">Red</option>\n              <option value="#0F0">Green</option>\n              <option value="#00F">Blue</option>\n              <option value="#FF0">Yellow</option>\n              <option value="#F0F">Magenta</option>\n              <option value="#0FF">Cyan</option>\n            </select>\n            <span class="vjs-text-opacity vjs-opacity">\n              <select>\n                <option value="">---</option>\n                <option value="1">Opaque</option>\n                <option value="0.5">Semi-Opaque</option>\n              </select>\n            </span>\n        </div> <!-- vjs-fg-color -->\n        <div class="vjs-bg-color vjs-tracksetting">\n            <label class="vjs-label">Background</label>\n            <select>\n              <option value="">---</option>\n              <option value="#FFF">White</option>\n              <option value="#000">Black</option>\n              <option value="#F00">Red</option>\n              <option value="#0F0">Green</option>\n              <option value="#00F">Blue</option>\n              <option value="#FF0">Yellow</option>\n              <option value="#F0F">Magenta</option>\n              <option value="#0FF">Cyan</option>\n            </select>\n            <span class="vjs-bg-opacity vjs-opacity">\n                <select>\n                  <option value="">---</option>\n                  <option value="1">Opaque</option>\n                  <option value="0.5">Semi-Transparent</option>\n                  <option value="0">Transparent</option>\n                </select>\n            </span>\n        </div> <!-- vjs-bg-color -->\n        <div class="window-color vjs-tracksetting">\n            <label class="vjs-label">Window</label>\n            <select>\n              <option value="">---</option>\n              <option value="#FFF">White</option>\n              <option value="#000">Black</option>\n              <option value="#F00">Red</option>\n              <option value="#0F0">Green</option>\n              <option value="#00F">Blue</option>\n              <option value="#FF0">Yellow</option>\n              <option value="#F0F">Magenta</option>\n              <option value="#0FF">Cyan</option>\n            </select>\n            <span class="vjs-window-opacity vjs-opacity">\n                <select>\n                  <option value="">---</option>\n                  <option value="1">Opaque</option>\n                  <option value="0.5">Semi-Transparent</option>\n                  <option value="0">Transparent</option>\n                </select>\n            </span>\n        </div> <!-- vjs-window-color -->\n      </div> <!-- vjs-tracksettings -->\n      <div class="vjs-tracksettings-font">\n        <div class="vjs-font-percent vjs-tracksetting">\n          <label class="vjs-label">Font Size</label>\n          <select>\n            <option value="0.50">50%</option>\n            <option value="0.75">75%</option>\n            <option value="1.00" selected>100%</option>\n            <option value="1.25">125%</option>\n            <option value="1.50">150%</option>\n            <option value="1.75">175%</option>\n            <option value="2.00">200%</option>\n            <option value="3.00">300%</option>\n            <option value="4.00">400%</option>\n          </select>\n        </div> <!-- vjs-font-percent -->\n        <div class="vjs-edge-style vjs-tracksetting">\n          <label class="vjs-label">Text Edge Style</label>\n          <select>\n            <option value="none">None</option>\n            <option value="raised">Raised</option>\n            <option value="depressed">Depressed</option>\n            <option value="uniform">Uniform</option>\n            <option value="dropshadow">Dropshadow</option>\n          </select>\n        </div> <!-- vjs-edge-style -->\n        <div class="vjs-font-family vjs-tracksetting">\n          <label class="vjs-label">Font Family</label>\n          <select>\n            <option value="">Default</option>\n            <option value="monospaceSerif">Monospace Serif</option>\n            <option value="proportionalSerif">Proportional Serif</option>\n            <option value="monospaceSansSerif">Monospace Sans-Serif</option>\n            <option value="proportionalSansSerif">Proportional Sans-Serif</option>\n            <option value="casual">Casual</option>\n            <option value="script">Script</option>\n            <option value="small-caps">Small Caps</option>\n          </select>\n        </div> <!-- vjs-font-family -->\n      </div>\n    </div>\n    <div class="vjs-tracksettings-controls">\n      <button class="vjs-default-button">Defaults</button>\n      <button class="vjs-done-button">Done</button>\n    </div>';
					return a
				}
				c.__esModule = !0;
				var k = a("../component"),
				l = e(k),
				m = a("../utils/events.js"),
				n = d(m),
				o = a("../utils/fn.js"),
				p = d(o),
				q = a("../utils/log.js"),
				r = e(q),
				s = a("safe-json-parse/tuple"),
				t = e(s),
				u = a("global/window"),
				v = e(u),
				w = function (a) {
					function b(c, d) {
						f(this, b),
						a.call(this, c, d),
						this.hide(),
						void 0 === d.persistTextTrackSettings && (this.options_.persistTextTrackSettings = this.options_.playerOptions.persistTextTrackSettings),
						n.on(this.$(".vjs-done-button"), "click", p.bind(this, function () {
								this.saveSettings(),
								this.hide()
							})),
						n.on(this.$(".vjs-default-button"), "click", p.bind(this, function () {
								this.$(".vjs-fg-color > select").selectedIndex = 0,
								this.$(".vjs-bg-color > select").selectedIndex = 0,
								this.$(".window-color > select").selectedIndex = 0,
								this.$(".vjs-text-opacity > select").selectedIndex = 0,
								this.$(".vjs-bg-opacity > select").selectedIndex = 0,
								this.$(".vjs-window-opacity > select").selectedIndex = 0,
								this.$(".vjs-edge-style select").selectedIndex = 0,
								this.$(".vjs-font-family select").selectedIndex = 0,
								this.$(".vjs-font-percent select").selectedIndex = 2,
								this.updateDisplay()
							})),
						n.on(this.$(".vjs-fg-color > select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".vjs-bg-color > select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".window-color > select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".vjs-text-opacity > select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".vjs-bg-opacity > select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".vjs-window-opacity > select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".vjs-font-percent select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".vjs-edge-style select"), "change", p.bind(this, this.updateDisplay)),
						n.on(this.$(".vjs-font-family select"), "change", p.bind(this, this.updateDisplay)),
						this.options_.persistTextTrackSettings && this.restoreSettings()
					}
					return g(b, a),
					b.prototype.createEl = function () {
						return a.prototype.createEl.call(this, "div", {
							className: "vjs-caption-settings vjs-modal-overlay",
							innerHTML: j()
						})
					},
					b.prototype.getValues = function () {
						var a = h(this.$(".vjs-edge-style select")),
						b = h(this.$(".vjs-font-family select")),
						c = h(this.$(".vjs-fg-color > select")),
						d = h(this.$(".vjs-text-opacity > select")),
						e = h(this.$(".vjs-bg-color > select")),
						f = h(this.$(".vjs-bg-opacity > select")),
						g = h(this.$(".window-color > select")),
						i = h(this.$(".vjs-window-opacity > select")),
						j = v["default"].parseFloat(h(this.$(".vjs-font-percent > select"))),
						k = {
							backgroundOpacity: f,
							textOpacity: d,
							windowOpacity: i,
							edgeStyle: a,
							fontFamily: b,
							color: c,
							backgroundColor: e,
							windowColor: g,
							fontPercent: j
						};
						for (var l in k)
							("" === k[l] || "none" === k[l] || "fontPercent" === l && 1 === k[l]) && delete k[l];
						return k
					},
					b.prototype.setValues = function (a) {
						i(this.$(".vjs-edge-style select"), a.edgeStyle),
						i(this.$(".vjs-font-family select"), a.fontFamily),
						i(this.$(".vjs-fg-color > select"), a.color),
						i(this.$(".vjs-text-opacity > select"), a.textOpacity),
						i(this.$(".vjs-bg-color > select"), a.backgroundColor),
						i(this.$(".vjs-bg-opacity > select"), a.backgroundOpacity),
						i(this.$(".window-color > select"), a.windowColor),
						i(this.$(".vjs-window-opacity > select"), a.windowOpacity);
						var b = a.fontPercent;
						b && (b = b.toFixed(2)),
						i(this.$(".vjs-font-percent > select"), b)
					},
					b.prototype.restoreSettings = function () {
						var a = void 0,
						b = void 0;
						try {
							var c = t["default"](v["default"].localStorage.getItem("vjs-text-track-settings"));
							a = c[0],
							b = c[1],
							a && r["default"].error(a)
						} catch (d) {
							r["default"].warn(d)
						}
						b && this.setValues(b)
					},
					b.prototype.saveSettings = function () {
						if (this.options_.persistTextTrackSettings) {
							var a = this.getValues();
							try {
								Object.getOwnPropertyNames(a).length > 0 ? v["default"].localStorage.setItem("vjs-text-track-settings", JSON.stringify(a)) : v["default"].localStorage.removeItem("vjs-text-track-settings")
							} catch (b) {
								r["default"].warn(b)
							}
						}
					},
					b.prototype.updateDisplay = function () {
						var a = this.player_.getChild("textTrackDisplay");
						a && a.updateDisplay()
					},
					b
				}
				(l["default"]);
				l["default"].registerComponent("TextTrackSettings", w),
				c["default"] = w,
				b.exports = c["default"]
			}, {
				"../component": 67,
				"../utils/events.js": 144,
				"../utils/fn.js": 145,
				"../utils/log.js": 148,
				"global/window": 2,
				"safe-json-parse/tuple": 54
			}
		],
		134: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./text-track-cue-list"),
				i = e(h),
				j = a("../utils/fn.js"),
				k = d(j),
				l = a("./track-enums"),
				m = a("../utils/log.js"),
				n = e(m),
				o = a("global/document"),
				p = (e(o), a("global/window")),
				q = e(p),
				r = a("./track.js"),
				s = e(r),
				t = a("../utils/url.js"),
				u = a("xhr"),
				v = e(u),
				w = a("../utils/merge-options"),
				x = e(w),
				y = a("../utils/browser.js"),
				z = d(y),
				A = function (a, b) {
					var c = new q["default"].WebVTT.Parser(q["default"], q["default"].vttjs, q["default"].WebVTT.StringDecoder()),
					d = [];
					c.oncue = function (a) {
						b.addCue(a)
					},
					c.onparsingerror = function (a) {
						d.push(a)
					},
					c.onflush = function () {
						b.trigger({
							type: "loadeddata",
							target: b
						})
					},
					c.parse(a),
					d.length > 0 && (console.groupCollapsed, d.forEach(function (a) {
							return n["default"].error(a)
						}), console.groupEnd),
					c.flush()
				},
				B = function (a, b) {
					var c = {
						uri: a
					},
					d = t.isCrossOrigin(a);
					d && (c.cors = d),
					v["default"](c, k.bind(this, function (a, c, d) {
							return a ? n["default"].error(a, c) : (b.loaded_ = !0, void("function" != typeof q["default"].WebVTT ? b.tech_ && !function () {
									var a = function () {
										return A(d, b)
									};
									b.tech_.on("vttjsloaded", a),
									b.tech_.on("vttjserror", function () {
										n["default"].error("vttjs failed to load, stopping trying to process " + b.src),
										b.tech_.off("vttjsloaded", a)
									})
								}
									() : A(d, b)))
						}))
				},
				C = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0];
						if (f(this, b), !c.tech)
							throw new Error("A tech was not provided.");
						var d = x["default"](c, {
								kind: l.TextTrackKind[c.kind] || "subtitles",
								language: c.language || c.srclang || ""
							}),
						e = l.TextTrackMode[d.mode] || "disabled",
						g = d["default"];
						("metadata" === d.kind || "chapters" === d.kind) && (e = "hidden");
						var h = a.call(this, d);
						if (h.tech_ = d.tech, z.IS_IE8)
							for (var j in b.prototype)
								"constructor" !== j && (h[j] = b.prototype[j]);
						h.cues_ = [],
						h.activeCues_ = [];
						var m = new i["default"](h.cues_),
						n = new i["default"](h.activeCues_),
						o = !1,
						p = k.bind(h, function () {
								this.activeCues,
								o && (this.trigger("cuechange"), o = !1)
							});
						return "disabled" !== e && h.tech_.on("timeupdate", p),
						Object.defineProperty(h, "default", {
							get: function () {
								return g
							},
							set: function () {}
						}),
						Object.defineProperty(h, "mode", {
							get: function () {
								return e
							},
							set: function (a) {
								l.TextTrackMode[a] && (e = a, "showing" === e && this.tech_.on("timeupdate", p), this.trigger("modechange"))
							}
						}),
						Object.defineProperty(h, "cues", {
							get: function () {
								return this.loaded_ ? m : null
							},
							set: function () {}
						}),
						Object.defineProperty(h, "activeCues", {
							get: function () {
								if (!this.loaded_)
									return null;
								if (0 === this.cues.length)
									return n;
								for (var a = this.tech_.currentTime(), b = [], c = 0, d = this.cues.length; d > c; c++) {
									var e = this.cues[c];
									e.startTime <= a && e.endTime >= a ? b.push(e) : e.startTime === e.endTime && e.startTime <= a && e.startTime + .5 >= a && b.push(e)
								}
								if (o = !1, b.length !== this.activeCues_.length)
									o = !0;
								else
									for (var c = 0; c < b.length; c++)
										 - 1 === this.activeCues_.indexOf(b[c]) && (o = !0);
								return this.activeCues_ = b,
								n.setCues_(this.activeCues_),
								n
							},
							set: function () {}
						}),
						d.src ? (h.src = d.src, B(d.src, h)) : h.loaded_ = !0,
						h
					}
					return g(b, a),
					b.prototype.addCue = function (a) {
						var b = this.tech_.textTracks();
						if (b)
							for (var c = 0; c < b.length; c++)
								b[c] !== this && b[c].removeCue(a);
						this.cues_.push(a),
						this.cues.setCues_(this.cues_)
					},
					b.prototype.removeCue = function (a) {
						for (var b = !1, c = 0, d = this.cues_.length; d > c; c++) {
							var e = this.cues_[c];
							e === a && (this.cues_.splice(c, 1), b = !0)
						}
						b && this.cues.setCues_(this.cues_)
					},
					b
				}
				(s["default"]);
				C.prototype.allowedEvents_ = {
					cuechange: "cuechange"
				},
				c["default"] = C,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"../utils/fn.js": 145,
				"../utils/log.js": 148,
				"../utils/merge-options": 149,
				"../utils/url.js": 153,
				"./text-track-cue-list": 129,
				"./track-enums": 135,
				"./track.js": 137,
				"global/document": 1,
				"global/window": 2,
				xhr: 56
			}
		],
		135: [function (a, b, c) {
				"use strict";
				c.__esModule = !0;
				var d = {
					alternative: "alternative",
					captions: "captions",
					main: "main",
					sign: "sign",
					subtitles: "subtitles",
					commentary: "commentary"
				},
				e = {
					alternative: "alternative",
					descriptions: "descriptions",
					main: "main",
					"main-desc": "main-desc",
					translation: "translation",
					commentary: "commentary"
				},
				f = {
					subtitles: "subtitles",
					captions: "captions",
					descriptions: "descriptions",
					chapters: "chapters",
					metadata: "metadata"
				},
				g = {
					disabled: "disabled",
					hidden: "hidden",
					showing: "showing"
				};
				c["default"] = {
					VideoTrackKind: d,
					AudioTrackKind: e,
					TextTrackKind: f,
					TextTrackMode: g
				},
				b.exports = c["default"]
			}, {}
		],
		136: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../event-target"),
				i = e(h),
				j = a("../utils/fn.js"),
				k = (d(j), a("../utils/browser.js")),
				l = d(k),
				m = a("global/document"),
				n = e(m),
				o = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? [] : arguments[0],
						d = arguments.length <= 1 || void 0 === arguments[1] ? null : arguments[1];
						if (f(this, b), a.call(this), !d && (d = this, l.IS_IE8)) {
							d = n["default"].createElement("custom");
							for (var e in b.prototype)
								"constructor" !== e && (d[e] = b.prototype[e])
						}
						d.tracks_ = [],
						Object.defineProperty(d, "length", {
							get: function () {
								return this.tracks_.length
							}
						});
						for (var g = 0; g < c.length; g++)
							d.addTrack_(c[g]);
						return d
					}
					return g(b, a),
					b.prototype.addTrack_ = function (a) {
						var b = this.tracks_.length;
						"" + b in this || Object.defineProperty(this, b, {
							get: function () {
								return this.tracks_[b]
							}
						}),
						-1 === this.tracks_.indexOf(a) && (this.tracks_.push(a), this.trigger({
								track: a,
								type: "addtrack"
							}))
					},
					b.prototype.removeTrack_ = function (a) {
						for (var b = void 0, c = 0, d = this.length; d > c; c++)
							if (this[c] === a) {
								b = this[c],
								b.off && b.off(),
								this.tracks_.splice(c, 1);
								break
							}
						b && this.trigger({
							track: b,
							type: "removetrack"
						})
					},
					b.prototype.getTrackById = function (a) {
						for (var b = null, c = 0, d = this.length; d > c; c++) {
							var e = this[c];
							if (e.id === a) {
								b = e;
								break
							}
						}
						return b
					},
					b
				}
				(i["default"]);
				o.prototype.allowedEvents_ = {
					change: "change",
					addtrack: "addtrack",
					removetrack: "removetrack"
				};
				for (var p in o.prototype.allowedEvents_)
					o.prototype["on" + p] = null;
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../event-target": 104,
				"../utils/browser.js": 140,
				"../utils/fn.js": 145,
				"global/document": 1
			}
		],
		137: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("../utils/browser.js"),
				i = e(h),
				j = a("global/document"),
				k = d(j),
				l = a("../utils/guid.js"),
				m = e(l),
				n = a("../event-target"),
				o = d(n),
				p = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0];
						f(this, b),
						a.call(this);
						var d = this;
						if (i.IS_IE8) {
							d = k["default"].createElement("custom");
							for (var e in b.prototype)
								"constructor" !== e && (d[e] = b.prototype[e])
						}
						var g = {
							id: c.id || "vjs_track_" + m.newGUID(),
							kind: c.kind || "",
							label: c.label || "",
							language: c.language || ""
						},
						h = function (a) {
							Object.defineProperty(d, a, {
								get: function () {
									return g[a]
								},
								set: function () {}
							})
						};
						for (var j in g)
							h(j);
						return d
					}
					return g(b, a),
					b
				}
				(o["default"]);
				c["default"] = p,
				b.exports = c["default"]
			}, {
				"../event-target": 104,
				"../utils/browser.js": 140,
				"../utils/guid.js": 147,
				"global/document": 1
			}
		],
		138: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./track-list"),
				i = e(h),
				j = a("../utils/browser.js"),
				k = d(j),
				l = a("global/document"),
				m = e(l),
				n = function (a, b) {
					for (var c = 0; c < a.length; c++)
						b.id !== a[c].id && (a[c].selected = !1)
				},
				o = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? [] : arguments[0];
						f(this, b);
						for (var d = void 0, e = c.length - 1; e >= 0; e--)
							if (c[e].selected) {
								n(c, c[e]);
								break
							}
						if (k.IS_IE8) {
							d = m["default"].createElement("custom");
							for (var g in i["default"].prototype)
								"constructor" !== g && (d[g] = i["default"].prototype[g]);
							for (var g in b.prototype)
								"constructor" !== g && (d[g] = b.prototype[g])
						}
						return d = a.call(this, c, d),
						d.changing_ = !1,
						Object.defineProperty(d, "selectedIndex", {
							get: function () {
								for (var a = 0; a < this.length; a++)
									if (this[a].selected)
										return a;
								return -1
							},
							set: function () {}
						}),
						d
					}
					return g(b, a),
					b.prototype.addTrack_ = function (b) {
						var c = this;
						b.selected && n(this, b),
						a.prototype.addTrack_.call(this, b),
						b.addEventListener && b.addEventListener("selectedchange", function () {
							c.changing_ || (c.changing_ = !0, n(c, b), c.changing_ = !1, c.trigger("change"))
						})
					},
					b.prototype.addTrack = function (a) {
						this.addTrack_(a)
					},
					b.prototype.removeTrack = function (b) {
						a.prototype.removeTrack_.call(this, b)
					},
					b
				}
				(i["default"]);
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"./track-list": 136,
				"global/document": 1
			}
		],
		139: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					if (!(a instanceof b))
						throw new TypeError("Cannot call a class as a function")
				}
				function g(a, b) {
					if ("function" != typeof b && null !== b)
						throw new TypeError("Super expression must either be null or a function, not " + typeof b);
					a.prototype = Object.create(b && b.prototype, {
							constructor: {
								value: a,
								enumerable: !1,
								writable: !0,
								configurable: !0
							}
						}),
					b && (Object.setPrototypeOf ? Object.setPrototypeOf(a, b) : a.__proto__ = b)
				}
				c.__esModule = !0;
				var h = a("./track-enums"),
				i = a("./track"),
				j = e(i),
				k = a("../utils/merge-options"),
				l = e(k),
				m = a("../utils/browser.js"),
				n = d(m),
				o = function (a) {
					function b() {
						var c = arguments.length <= 0 || void 0 === arguments[0] ? {}
						 : arguments[0];
						f(this, b);
						var d = l["default"](c, {
								kind: h.VideoTrackKind[c.kind] || ""
							}),
						e = a.call(this, d),
						g = !1;
						if (n.IS_IE8)
							for (var i in b.prototype)
								"constructor" !== i && (e[i] = b.prototype[i]);
						return Object.defineProperty(e, "selected", {
							get: function () {
								return g
							},
							set: function (a) {
								"boolean" == typeof a && a !== g && (g = a, this.trigger("selectedchange"))
							}
						}),
						d.selected && (e.selected = d.selected),
						e
					}
					return g(b, a),
					b
				}
				(j["default"]);
				c["default"] = o,
				b.exports = c["default"]
			}, {
				"../utils/browser.js": 140,
				"../utils/merge-options": 149,
				"./track": 137,
				"./track-enums": 135
			}
		],
		140: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				var e = a("global/document"),
				f = d(e),
				g = a("global/window"),
				h = d(g),
				i = h["default"].navigator.userAgent,
				j = /AppleWebKit\/([\d.]+)/i.exec(i),
				k = j ? parseFloat(j.pop()) : null,
				l = /iPad/i.test(i);
				c.IS_IPAD = l;
				var m = /iPhone/i.test(i) && !l;
				c.IS_IPHONE = m;
				var n = /iPod/i.test(i);
				c.IS_IPOD = n;
				var o = m || l || n;
				c.IS_IOS = o;
				var p = function () {
					var a = i.match(/OS (\d+)_/i);
					return a && a[1] ? a[1] : void 0
				}
				();
				c.IOS_VERSION = p;
				var q = /Android/i.test(i);
				c.IS_ANDROID = q;
				var r = function () {
					var a,
					b,
					c = i.match(/Android (\d+)(?:\.(\d+))?(?:\.(\d+))*/i);
					return c ? (a = c[1] && parseFloat(c[1]), b = c[2] && parseFloat(c[2]), a && b ? parseFloat(c[1] + "." + c[2]) : a ? a : null) : null
				}
				();
				c.ANDROID_VERSION = r;
				var s = q && /webkit/i.test(i) && 2.3 > r;
				c.IS_OLD_ANDROID = s;
				var t = q && 5 > r && 537 > k;
				c.IS_NATIVE_ANDROID = t;
				var u = /Firefox/i.test(i);
				c.IS_FIREFOX = u;
				var v = /Edge/i.test(i);
				c.IS_EDGE = v;
				var w = !v && /Chrome/i.test(i);
				c.IS_CHROME = w;
				var x = /MSIE\s8\.0/.test(i);
				c.IS_IE8 = x;
				var y = !!("ontouchstart" in h["default"] || h["default"].DocumentTouch && f["default"]instanceof h["default"].DocumentTouch);
				c.TOUCH_ENABLED = y;
				var z = "backgroundSize" in f["default"].createElement("video").style;
				c.BACKGROUND_SIZE_SUPPORTED = z
			}, {
				"global/document": 1,
				"global/window": 2
			}
		],
		141: [function (a, b, c) {
				"use strict";
				function d(a, b) {
					var c,
					d,
					f = 0;
					if (!b)
						return 0;
					a && a.length || (a = e.createTimeRange(0, 0));
					for (var g = 0; g < a.length; g++)
						c = a.start(g), d = a.end(g), d > b && (d = b), f += d - c;
					return f / b
				}
				c.__esModule = !0,
				c.bufferedPercent = d;
				var e = a("./time-ranges.js")
			}, {
				"./time-ranges.js": 151
			}
		],
		142: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				var e = a("./log.js"),
				f = d(e),
				g = {
					get: function (a, b) {
						return a[b]
					},
					set: function (a, b, c) {
						return a[b] = c,
						!0
					}
				};
				c["default"] = function (a) {
					var b = arguments.length <= 1 || void 0 === arguments[1] ? {}
					 : arguments[1];
					if ("function" == typeof Proxy) {
						var c = function () {
							var c = {};
							return Object.keys(b).forEach(function (a) {
								g.hasOwnProperty(a) && (c[a] = function () {
									return f["default"].warn(b[a]),
									g[a].apply(this, arguments)
								})
							}), {
								v: new Proxy(a, c)
							}
						}
						();
						if ("object" == typeof c)
							return c.v
					}
					return a
				},
				b.exports = c["default"]
			}, {
				"./log.js": 148
			}
		],
		143: [function (a, b, c) {
				"use strict";
				function d(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function e(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function f(a, b) {
					return a.raw = b,
					a
				}
				function g(a) {
					return "string" == typeof a && /\S/.test(a)
				}
				function h(a) {
					if (/\s/.test(a))
						throw new Error("class has illegal whitespace characters")
				}
				function i(a) {
					return new RegExp("(^|\\s)" + a + "($|\\s)")
				}
				function j(a) {
					return function (b, c) {
						return g(b) ? (g(c) && (c = J["default"].querySelector(c)), (B(c) ? c : J["default"])[a](b)) : J["default"][a](null)
					}
				}
				function k(a) {
					return 0 === a.indexOf("#") && (a = a.slice(1)),
					J["default"].getElementById(a)
				}
				function l() {
					var a = arguments.length <= 0 || void 0 === arguments[0] ? "div" : arguments[0],
					b = arguments.length <= 1 || void 0 === arguments[1] ? {}
					 : arguments[1],
					c = arguments.length <= 2 || void 0 === arguments[2] ? {}
					 : arguments[2],
					d = J["default"].createElement(a);
					return Object.getOwnPropertyNames(b).forEach(function (a) {
						var c = b[a];
						-1 !== a.indexOf("aria-") || "role" === a || "type" === a ? (P["default"].warn(R["default"](H, a, c)), d.setAttribute(a, c)) : d[a] = c
					}),
					Object.getOwnPropertyNames(c).forEach(function (a) {
						c[a];
						d.setAttribute(a, c[a])
					}),
					d
				}
				function m(a, b) {
					"undefined" == typeof a.textContent ? a.innerText = b : a.textContent = b
				}
				function n(a, b) {
					b.firstChild ? b.insertBefore(a, b.firstChild) : b.appendChild(a)
				}
				function o(a) {
					var b = a[T];
					return b || (b = a[T] = N.newGUID()),
					S[b] || (S[b] = {}),
					S[b]
				}
				function p(a) {
					var b = a[T];
					return b ? !!Object.getOwnPropertyNames(S[b]).length : !1
				}
				function q(a) {
					var b = a[T];
					if (b) {
						delete S[b];
						try {
							delete a[T]
						} catch (c) {
							a.removeAttribute ? a.removeAttribute(T) : a[T] = null
						}
					}
				}
				function r(a, b) {
					return a.classList ? a.classList.contains(b) : (h(b), i(b).test(a.className))
				}
				function s(a, b) {
					return a.classList ? a.classList.add(b) : r(a, b) || (a.className = (a.className + " " + b).trim()),
					a
				}
				function t(a, b) {
					return a.classList ? a.classList.remove(b) : (h(b), a.className = a.className.split(/\s+/).filter(function (a) {
								return a !== b
							}).join(" ")),
					a
				}
				function u(a, b, c) {
					var d = r(a, b);
					return "function" == typeof c && (c = c(a, b)),
					"boolean" != typeof c && (c = !d),
					c !== d ? (c ? s(a, b) : t(a, b), a) : void 0
				}
				function v(a, b) {
					Object.getOwnPropertyNames(b).forEach(function (c) {
						var d = b[c];
						null === d || "undefined" == typeof d || d === !1 ? a.removeAttribute(c) : a.setAttribute(c, d === !0 ? "" : d)
					})
				}
				function w(a) {
					var b,
					c,
					d,
					e,
					f;
					if (b = {}, c = ",autoplay,controls,loop,muted,default,", a && a.attributes && a.attributes.length > 0) {
						d = a.attributes;
						for (var g = d.length - 1; g >= 0; g--)
							e = d[g].name, f = d[g].value, ("boolean" == typeof a[e] || -1 !== c.indexOf("," + e + ",")) && (f = null !== f ? !0 : !1), b[e] = f
					}
					return b
				}
				function x() {
					J["default"].body.focus(),
					J["default"].onselectstart = function () {
						return !1
					}
				}
				function y() {
					J["default"].onselectstart = function () {
						return !0
					}
				}
				function z(a) {
					var b = void 0;
					if (a.getBoundingClientRect && a.parentNode && (b = a.getBoundingClientRect()), !b)
						return {
							left: 0,
							top: 0
						};
					var c = J["default"].documentElement,
					d = J["default"].body,
					e = c.clientLeft || d.clientLeft || 0,
					f = L["default"].pageXOffset || d.scrollLeft,
					g = b.left + f - e,
					h = c.clientTop || d.clientTop || 0,
					i = L["default"].pageYOffset || d.scrollTop,
					j = b.top + i - h;
					return {
						left: Math.round(g),
						top: Math.round(j)
					}
				}
				function A(a, b) {
					var c = {},
					d = z(a),
					e = a.offsetWidth,
					f = a.offsetHeight,
					g = d.top,
					h = d.left,
					i = b.pageY,
					j = b.pageX;
					return b.changedTouches && (j = b.changedTouches[0].pageX, i = b.changedTouches[0].pageY),
					c.y = Math.max(0, Math.min(1, (g - i + f) / f)),
					c.x = Math.max(0, Math.min(1, (j - h) / e)),
					c
				}
				function B(a) {
					return !!a && "object" == typeof a && 1 === a.nodeType
				}
				function C(a) {
					return !!a && "object" == typeof a && 3 === a.nodeType
				}
				function D(a) {
					for (; a.firstChild; )
						a.removeChild(a.firstChild);
					return a
				}
				function E(a) {
					return "function" == typeof a && (a = a()),
					(Array.isArray(a) ? a : [a]).map(function (a) {
						return "function" == typeof a && (a = a()),
						B(a) || C(a) ? a : "string" == typeof a && /\S/.test(a) ? J["default"].createTextNode(a) : void 0
					}).filter(function (a) {
						return a
					})
				}
				function F(a, b) {
					return E(b).forEach(function (b) {
						return a.appendChild(b)
					}),
					a
				}
				function G(a, b) {
					return F(D(a), b)
				}
				c.__esModule = !0,
				c.getEl = k,
				c.createEl = l,
				c.textContent = m,
				c.insertElFirst = n,
				c.getElData = o,
				c.hasElData = p,
				c.removeElData = q,
				c.hasElClass = r,
				c.addElClass = s,
				c.removeElClass = t,
				c.toggleElClass = u,
				c.setElAttributes = v,
				c.getElAttributes = w,
				c.blockTextSelection = x,
				c.unblockTextSelection = y,
				c.findElPosition = z,
				c.getPointerPosition = A,
				c.isEl = B,
				c.isTextNode = C,
				c.emptyEl = D,
				c.normalizeContent = E,
				c.appendContent = F,
				c.insertContent = G;
				var H = f(["Setting attributes in the second argument of createEl()\n                has been deprecated. Use the third argument instead.\n                createEl(type, properties, attributes). Attempting to set ", " to ", "."], ["Setting attributes in the second argument of createEl()\n                has been deprecated. Use the third argument instead.\n                createEl(type, properties, attributes). Attempting to set ", " to ", "."]),
				I = a("global/document"),
				J = e(I),
				K = a("global/window"),
				L = e(K),
				M = a("./guid.js"),
				N = d(M),
				O = a("./log.js"),
				P = e(O),
				Q = a("tsml"),
				R = e(Q),
				S = {},
				T = "vdata" + (new Date).getTime(),
				U = j("querySelector");
				c.$ = U;
				var V = j("querySelectorAll");
				c.$$ = V
			}, {
				"./guid.js": 147,
				"./log.js": 148,
				"global/document": 1,
				"global/window": 2,
				tsml: 55
			}
		],
		144: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a, b, c) {
					if (Array.isArray(b))
						return l(f, a, b, c);
					var d = n.getElData(a);
					d.handlers || (d.handlers = {}),
					d.handlers[b] || (d.handlers[b] = []),
					c.guid || (c.guid = p.newGUID()),
					d.handlers[b].push(c),
					d.dispatcher || (d.disabled = !1, d.dispatcher = function (b, c) {
						if (!d.disabled) {
							b = j(b);
							var e = d.handlers[b.type];
							if (e)
								for (var f = e.slice(0), g = 0, h = f.length; h > g && !b.isImmediatePropagationStopped(); g++)
									f[g].call(a, b, c)
						}
					}),
					1 === d.handlers[b].length && (a.addEventListener ? a.addEventListener(b, d.dispatcher, !1) : a.attachEvent && a.attachEvent("on" + b, d.dispatcher))
				}
				function g(a, b, c) {
					if (n.hasElData(a)) {
						var d = n.getElData(a);
						if (d.handlers) {
							if (Array.isArray(b))
								return l(g, a, b, c);
							var e = function (b) {
								d.handlers[b] = [],
								k(a, b)
							};
							if (b) {
								var f = d.handlers[b];
								if (f) {
									if (!c)
										return void e(b);
									if (c.guid)
										for (var h = 0; h < f.length; h++)
											f[h].guid === c.guid && f.splice(h--, 1);
									k(a, b)
								}
							} else
								for (var i in d.handlers)
									e(i)
						}
					}
				}
				function h(a, b, c) {
					var d = n.hasElData(a) ? n.getElData(a) : {},
					e = a.parentNode || a.ownerDocument;
					if ("string" == typeof b && (b = {
								type: b,
								target: a
							}), b = j(b), d.dispatcher && d.dispatcher.call(a, b, c), e && !b.isPropagationStopped() && b.bubbles === !0)
						h.call(null, e, b, c);
					else if (!e && !b.defaultPrevented) {
						var f = n.getElData(b.target);
						b.target[b.type] && (f.disabled = !0, "function" == typeof b.target[b.type] && b.target[b.type](), f.disabled = !1)
					}
					return !b.defaultPrevented
				}
				function i(a, b, c) {
					if (Array.isArray(b))
						return l(i, a, b, c);
					var d = function e() {
						g(a, b, e),
						c.apply(this, arguments)
					};
					d.guid = c.guid = c.guid || p.newGUID(),
					f(a, b, d)
				}
				function j(a) {
					function b() {
						return !0
					}
					function c() {
						return !1
					}
					if (!a || !a.isPropagationStopped) {
						var d = a || r["default"].event;
						a = {};
						for (var e in d)
							"layerX" !== e && "layerY" !== e && "keyLocation" !== e && "webkitMovementX" !== e && "webkitMovementY" !== e && ("returnValue" === e && d.preventDefault || (a[e] = d[e]));
						if (a.target || (a.target = a.srcElement || t["default"]), a.relatedTarget || (a.relatedTarget = a.fromElement === a.target ? a.toElement : a.fromElement), a.preventDefault = function () {
							d.preventDefault && d.preventDefault(),
							a.returnValue = !1,
							d.returnValue = !1,
							a.defaultPrevented = !0
						}, a.defaultPrevented = !1, a.stopPropagation = function () {
							d.stopPropagation && d.stopPropagation(),
							a.cancelBubble = !0,
							d.cancelBubble = !0,
							a.isPropagationStopped = b
						}, a.isPropagationStopped = c, a.stopImmediatePropagation = function () {
							d.stopImmediatePropagation && d.stopImmediatePropagation(),
							a.isImmediatePropagationStopped = b,
							a.stopPropagation()
						}, a.isImmediatePropagationStopped = c, null != a.clientX) {
							var f = t["default"].documentElement,
							g = t["default"].body;
							a.pageX = a.clientX + (f && f.scrollLeft || g && g.scrollLeft || 0) - (f && f.clientLeft || g && g.clientLeft || 0),
							a.pageY = a.clientY + (f && f.scrollTop || g && g.scrollTop || 0) - (f && f.clientTop || g && g.clientTop || 0)
						}
						a.which = a.charCode || a.keyCode,
						null != a.button && (a.button = 1 & a.button ? 0 : 4 & a.button ? 1 : 2 & a.button ? 2 : 0)
					}
					return a
				}
				function k(a, b) {
					var c = n.getElData(a);
					0 === c.handlers[b].length && (delete c.handlers[b], a.removeEventListener ? a.removeEventListener(b, c.dispatcher, !1) : a.detachEvent && a.detachEvent("on" + b, c.dispatcher)),
					Object.getOwnPropertyNames(c.handlers).length <= 0 && (delete c.handlers, delete c.dispatcher, delete c.disabled),
					0 === Object.getOwnPropertyNames(c).length && n.removeElData(a)
				}
				function l(a, b, c, d) {
					c.forEach(function (c) {
						a(b, c, d)
					})
				}
				c.__esModule = !0,
				c.on = f,
				c.off = g,
				c.trigger = h,
				c.one = i,
				c.fixEvent = j;
				var m = a("./dom.js"),
				n = e(m),
				o = a("./guid.js"),
				p = e(o),
				q = a("global/window"),
				r = d(q),
				s = a("global/document"),
				t = d(s)
			}, {
				"./dom.js": 143,
				"./guid.js": 147,
				"global/document": 1,
				"global/window": 2
			}
		],
		145: [function (a, b, c) {
				"use strict";
				c.__esModule = !0;
				var d = a("./guid.js"),
				e = function (a, b, c) {
					b.guid || (b.guid = d.newGUID());
					var e = function () {
						return b.apply(a, arguments)
					};
					return e.guid = c ? c + "_" + b.guid : b.guid,
					e
				};
				c.bind = e
			}, {
				"./guid.js": 147
			}
		],
		146: [function (a, b, c) {
				"use strict";
				function d(a) {
					var b = arguments.length <= 1 || void 0 === arguments[1] ? a : arguments[1];
					return function () {
						a = 0 > a ? 0 : a;
						var c = Math.floor(a % 60),
						d = Math.floor(a / 60 % 60),
						e = Math.floor(a / 3600),
						f = Math.floor(b / 60 % 60),
						g = Math.floor(b / 3600);
						return (isNaN(a) || a === 1 / 0) && (e = d = c = "-"),
						e = e > 0 || g > 0 ? e + ":" : "",
						d = ((e || f >= 10) && 10 > d ? "0" + d : d) + ":",
						c = 10 > c ? "0" + c : c,
						e + d + c
					}
					()
				}
				c.__esModule = !0,
				c["default"] = d,
				b.exports = c["default"]
			}, {}
		],
		147: [function (a, b, c) {
				"use strict";
				function d() {
					return e++
				}
				c.__esModule = !0,
				c.newGUID = d;
				var e = 1
			}, {}
		],
		148: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					var c = Array.prototype.slice.call(b),
					d = function () {},
					e = g["default"].console || {
						log: d,
						warn: d,
						error: d
					};
					a ? c.unshift(a.toUpperCase() + ":") : a = "log",
					h.history.push(c),
					c.unshift("VIDEOJS:"),
					e[a].apply ? e[a].apply(e, c) : e[a](c.join(" "))
				}
				c.__esModule = !0;
				var f = a("global/window"),
				g = d(f),
				h = function () {
					e(null, arguments)
				};
				h.history = [],
				h.error = function () {
					e("error", arguments)
				},
				h.warn = function () {
					e("warn", arguments)
				},
				c["default"] = h,
				b.exports = c["default"]
			}, {
				"global/window": 2
			}
		],
		149: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a) {
					return !!a && "object" == typeof a && "[object Object]" === a.toString() && a.constructor === Object
				}
				function f() {
					var a = Array.prototype.slice.call(arguments);
					return a.unshift({}),
					a.push(i),
					h["default"].apply(null, a),
					a[0]
				}
				c.__esModule = !0,
				c["default"] = f;
				var g = a("lodash-compat/object/merge"),
				h = d(g),
				i = function (a, b) {
					return e(b) ? e(a) ? void 0 : f(b) : b
				};
				b.exports = c["default"]
			}, {
				"lodash-compat/object/merge": 40
			}
		],
		150: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				var e = a("global/document"),
				f = d(e),
				g = function (a) {
					var b = f["default"].createElement("style");
					return b.className = a,
					b
				};
				c.createStyleElement = g;
				var h = function (a, b) {
					a.styleSheet ? a.styleSheet.cssText = b : a.textContent = b
				};
				c.setTextContent = h
			}, {
				"global/document": 1
			}
		],
		151: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function e(a, b) {
					return Array.isArray(a) ? f(a) : void 0 === a || void 0 === b ? f() : f([[a, b]])
				}
				function f(a) {
					return void 0 === a || 0 === a.length ? {
						length: 0,
						start: function () {
							throw new Error("This TimeRanges object is empty")
						},
						end: function () {
							throw new Error("This TimeRanges object is empty")
						}
					}
					 : {
						length: a.length,
						start: g.bind(null, "start", 0, a),
						end: g.bind(null, "end", 1, a)
					}
				}
				function g(a, b, c, d) {
					return void 0 === d && (j["default"].warn("DEPRECATED: Function '" + a + "' on 'TimeRanges' called without an index argument."), d = 0),
					h(a, d, c.length - 1),
					c[d][b]
				}
				function h(a, b, c) {
					if (0 > b || b > c)
						throw new Error("Failed to execute '" + a + "' on 'TimeRanges': The index provided (" + b + ") is greater than or equal to the maximum bound (" + c + ").")
				}
				c.__esModule = !0,
				c.createTimeRanges = e;
				var i = a("./log.js"),
				j = d(i);
				c.createTimeRange = e
			}, {
				"./log.js": 148
			}
		],
		152: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a.charAt(0).toUpperCase() + a.slice(1)
				}
				c.__esModule = !0,
				c["default"] = d,
				b.exports = c["default"]
			}, {}
		],
		153: [function (a, b, c) {
				"use strict";
				function d(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				c.__esModule = !0;
				var e = a("global/document"),
				f = d(e),
				g = a("global/window"),
				h = d(g),
				i = function (a) {
					var b = ["protocol", "hostname", "port", "pathname", "search", "hash", "host"],
					c = f["default"].createElement("a");
					c.href = a;
					var d = "" === c.host && "file:" !== c.protocol,
					e = void 0;
					d && (e = f["default"].createElement("div"), e.innerHTML = '<a href="' + a + '"></a>', c = e.firstChild, e.setAttribute("style", "display:none; position:absolute;"), f["default"].body.appendChild(e));
					for (var g = {}, h = 0; h < b.length; h++)
						g[b[h]] = c[b[h]];
					return "http:" === g.protocol && (g.host = g.host.replace(/:80$/, "")),
					"https:" === g.protocol && (g.host = g.host.replace(/:443$/, "")),
					d && f["default"].body.removeChild(e),
					g
				};
				c.parseUrl = i;
				var j = function (a) {
					if (!a.match(/^https?:\/\//)) {
						var b = f["default"].createElement("div");
						b.innerHTML = '<a href="' + a + '">x</a>',
						a = b.firstChild.href
					}
					return a
				};
				c.getAbsoluteURL = j;
				var k = function (a) {
					if ("string" == typeof a) {
						var b = /^(\/?)([\s\S]*?)((?:\.{1,2}|[^\/]+?)(\.([^\.\/\?]+)))(?:[\/]*|[\?].*)$/i,
						c = b.exec(a);
						if (c)
							return c.pop().toLowerCase()
					}
					return ""
				};
				c.getFileExtension = k;
				var l = function (a) {
					var b = h["default"].location,
					c = i(a),
					d = ":" === c.protocol ? b.protocol : c.protocol,
					e = d + c.host !== b.protocol + b.host;
					return e
				};
				c.isCrossOrigin = l
			}, {
				"global/document": 1,
				"global/window": 2
			}
		],
		154: [function (b, c, d) {
				"use strict";
				function e(a) {
					if (a && a.__esModule)
						return a;
					var b = {};
					if (null != a)
						for (var c in a)
							Object.prototype.hasOwnProperty.call(a, c) && (b[c] = a[c]);
					return b["default"] = a,
					b
				}
				function f(a) {
					return a && a.__esModule ? a : {
						"default": a
					}
				}
				function g(a, b, c) {
					var d = void 0;
					if ("string" == typeof a) {
						if (0 === a.indexOf("#") && (a = a.slice(1)), g.getPlayers()[a])
							return b && O["default"].warn('Player "' + a + '" is already initialised. Options will not be applied.'), c && g.getPlayers()[a].ready(c), g.getPlayers()[a];
						d = Q.getEl(a)
					} else
						d = a;
					if (!d || !d.nodeName)
						throw new TypeError("The element or ID supplied is not valid. (videojs)");
					return d.player || w["default"].players[d.playerId] || new w["default"](d, b, c)
				}
				d.__esModule = !0; {
					var h = b("global/window"),
					i = f(h),
					j = b("global/document"),
					k = f(j),
					l = b("./setup"),
					m = e(l),
					n = b("./utils/stylesheet.js"),
					o = e(n),
					p = b("./component"),
					q = f(p),
					r = b("./event-target"),
					s = f(r),
					t = b("./utils/events.js"),
					u = e(t),
					v = b("./player"),
					w = f(v),
					x = b("./plugins.js"),
					y = f(x),
					z = b("../../src/js/utils/merge-options.js"),
					A = f(z),
					B = b("./utils/fn.js"),
					C = e(B),
					D = b("./tracks/text-track.js"),
					E = f(D),
					F = b("./tracks/audio-track.js"),
					G = f(F),
					H = b("./tracks/video-track.js"),
					I = f(H),
					J = b("object.assign"),
					K = (f(J), b("./utils/time-ranges.js")),
					L = b("./utils/format-time.js"),
					M = f(L),
					N = b("./utils/log.js"),
					O = f(N),
					P = b("./utils/dom.js"),
					Q = e(P),
					R = b("./utils/browser.js"),
					S = e(R),
					T = b("./utils/url.js"),
					U = e(T),
					V = b("./extend.js"),
					W = f(V),
					X = b("lodash-compat/object/merge"),
					Y = f(X),
					Z = b("./utils/create-deprecation-proxy.js"),
					$ = f(Z),
					_ = b("xhr"),
					aa = f(_),
					ba = b("./tech/tech.js"),
					ca = f(ba),
					da = b("./tech/html5.js"),
					ea = (f(da), b("./tech/flash.js"));
					f(ea)
				}
				if ("undefined" == typeof HTMLVideoElement && (k["default"].createElement("video"), k["default"].createElement("audio"), k["default"].createElement("track")), i["default"].VIDEOJS_NO_DYNAMIC_STYLE !== !0) {
					var fa = Q.$(".vjs-styles-defaults");
					if (!fa) {
						fa = o.createStyleElement("vjs-styles-defaults");
						var ga = Q.$("head");
						ga.insertBefore(fa, ga.firstChild),
						o.setTextContent(fa, "\n      .video-js {\n        width: 300px;\n        height: 150px;\n      }\n\n      .vjs-fluid {\n        padding-top: 56.25%\n      }\n    ")
					}
				}
				m.autoSetupTimeout(1, g),
				g.VERSION = "5.10.7",
				g.options = w["default"].prototype.options_,
				g.getPlayers = function () {
					return w["default"].players
				},
				g.players = $["default"](w["default"].players, {
						get: "Access to videojs.players is deprecated; use videojs.getPlayers instead",
						set: "Modification of videojs.players is deprecated"
					}),
				g.getComponent = q["default"].getComponent,
				g.registerComponent = function (a, b) {
					ca["default"].isTech(b) && O["default"].warn("The " + a + " tech was registered as a component. It should instead be registered using videojs.registerTech(name, tech)"),
					q["default"].registerComponent.call(q["default"], a, b)
				},
				g.getTech = ca["default"].getTech,
				g.registerTech = ca["default"].registerTech,
				g.browser = S,
				g.TOUCH_ENABLED = S.TOUCH_ENABLED,
				g.extend = W["default"],
				g.mergeOptions = A["default"],
				g.bind = C.bind,
				g.plugin = y["default"],
				g.addLanguage = function (a, b) {
					var c;
					return a = ("" + a).toLowerCase(),
					Y["default"](g.options.languages, (c = {}, c[a] = b, c))[a]
				},
				g.log = O["default"],
				g.createTimeRange = g.createTimeRanges = K.createTimeRanges,
				g.formatTime = M["default"],
				g.parseUrl = U.parseUrl,
				g.isCrossOrigin = U.isCrossOrigin,
				g.EventTarget = s["default"],
				g.on = u.on,
				g.one = u.one,
				g.off = u.off,
				g.trigger = u.trigger,
				g.xhr = aa["default"],
				g.TextTrack = E["default"],
				g.AudioTrack = G["default"],
				g.VideoTrack = I["default"],
				g.isEl = Q.isEl,
				g.isTextNode = Q.isTextNode,
				g.createEl = Q.createEl,
				g.hasClass = Q.hasElClass,
				g.addClass = Q.addElClass,
				g.removeClass = Q.removeElClass,
				g.toggleClass = Q.toggleElClass,
				g.setAttributes = Q.setElAttributes,
				g.getAttributes = Q.getElAttributes,
				g.emptyEl = Q.emptyEl,
				g.appendContent = Q.appendContent,
				g.insertContent = Q.insertContent,
				"function" == typeof a && a.amd ? a("videojs", [], function () {
					return g
				}) : "object" == typeof d && "object" == typeof c && (c.exports = g),
				d["default"] = g,
				c.exports = d["default"]
			}, {
				"../../src/js/utils/merge-options.js": 149,
				"./component": 67,
				"./event-target": 104,
				"./extend.js": 105,
				"./player": 113,
				"./plugins.js": 114,
				"./setup": 118,
				"./tech/flash.js": 121,
				"./tech/html5.js": 122,
				"./tech/tech.js": 124,
				"./tracks/audio-track.js": 126,
				"./tracks/text-track.js": 134,
				"./tracks/video-track.js": 139,
				"./utils/browser.js": 140,
				"./utils/create-deprecation-proxy.js": 142,
				"./utils/dom.js": 143,
				"./utils/events.js": 144,
				"./utils/fn.js": 145,
				"./utils/format-time.js": 146,
				"./utils/log.js": 148,
				"./utils/stylesheet.js": 150,
				"./utils/time-ranges.js": 151,
				"./utils/url.js": 153,
				"global/document": 1,
				"global/window": 2,
				"lodash-compat/object/merge": 40,
				"object.assign": 45,
				xhr: 56
			}
		]
	}, {}, [154])(154)
}), function (a) {
	var b = a.vttjs = {},
	c = b.VTTCue,
	d = b.VTTRegion,
	e = a.VTTCue,
	f = a.VTTRegion;
	b.shim = function () {
		b.VTTCue = c,
		b.VTTRegion = d
	},
	b.restore = function () {
		b.VTTCue = e,
		b.VTTRegion = f
	}
}
(this), function (a, b) {
	function c(a) {
		if ("string" != typeof a)
			return !1;
		var b = h[a.toLowerCase()];
		return b ? a.toLowerCase() : !1
	}
	function d(a) {
		if ("string" != typeof a)
			return !1;
		var b = i[a.toLowerCase()];
		return b ? a.toLowerCase() : !1
	}
	function e(a) {
		for (var b = 1; b < arguments.length; b++) {
			var c = arguments[b];
			for (var d in c)
				a[d] = c[d]
		}
		return a
	}
	function f(a, b, f) {
		var h = this,
		i = /MSIE\s8\.0/.test(navigator.userAgent),
		j = {};
		i ? h = document.createElement("custom") : j.enumerable = !0,
		h.hasBeenReset = !1;
		var k = "",
		l = !1,
		m = a,
		n = b,
		o = f,
		p = null,
		q = "",
		r = !0,
		s = "auto",
		t = "start",
		u = 50,
		v = "middle",
		w = 50,
		x = "middle";
		return Object.defineProperty(h, "id", e({}, j, {
				get: function () {
					return k
				},
				set: function (a) {
					k = "" + a
				}
			})),
		Object.defineProperty(h, "pauseOnExit", e({}, j, {
				get: function () {
					return l
				},
				set: function (a) {
					l = !!a
				}
			})),
		Object.defineProperty(h, "startTime", e({}, j, {
				get: function () {
					return m
				},
				set: function (a) {
					if ("number" != typeof a)
						throw new TypeError("Start time must be set to a number.");
					m = a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "endTime", e({}, j, {
				get: function () {
					return n
				},
				set: function (a) {
					if ("number" != typeof a)
						throw new TypeError("End time must be set to a number.");
					n = a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "text", e({}, j, {
				get: function () {
					return o
				},
				set: function (a) {
					o = "" + a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "region", e({}, j, {
				get: function () {
					return p
				},
				set: function (a) {
					p = a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "vertical", e({}, j, {
				get: function () {
					return q
				},
				set: function (a) {
					var b = c(a);
					if (b === !1)
						throw new SyntaxError("An invalid or illegal string was specified.");
					q = b,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "snapToLines", e({}, j, {
				get: function () {
					return r
				},
				set: function (a) {
					r = !!a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "line", e({}, j, {
				get: function () {
					return s
				},
				set: function (a) {
					if ("number" != typeof a && a !== g)
						throw new SyntaxError("An invalid number or illegal string was specified.");
					s = a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "lineAlign", e({}, j, {
				get: function () {
					return t
				},
				set: function (a) {
					var b = d(a);
					if (!b)
						throw new SyntaxError("An invalid or illegal string was specified.");
					t = b,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "position", e({}, j, {
				get: function () {
					return u
				},
				set: function (a) {
					if (0 > a || a > 100)
						throw new Error("Position must be between 0 and 100.");
					u = a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "positionAlign", e({}, j, {
				get: function () {
					return v
				},
				set: function (a) {
					var b = d(a);
					if (!b)
						throw new SyntaxError("An invalid or illegal string was specified.");
					v = b,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "size", e({}, j, {
				get: function () {
					return w
				},
				set: function (a) {
					if (0 > a || a > 100)
						throw new Error("Size must be between 0 and 100.");
					w = a,
					this.hasBeenReset = !0
				}
			})),
		Object.defineProperty(h, "align", e({}, j, {
				get: function () {
					return x
				},
				set: function (a) {
					var b = d(a);
					if (!b)
						throw new SyntaxError("An invalid or illegal string was specified.");
					x = b,
					this.hasBeenReset = !0
				}
			})),
		h.displayState = void 0,
		i ? h : void 0
	}
	var g = "auto",
	h = {
		"": !0,
		lr: !0,
		rl: !0
	},
	i = {
		start: !0,
		middle: !0,
		end: !0,
		left: !0,
		right: !0
	};
	f.prototype.getCueAsHTML = function () {
		return WebVTT.convertCueToDOMTree(window, this.text)
	},
	a.VTTCue = a.VTTCue || f,
	b.VTTCue = f
}
(this, this.vttjs || {}), function (a, b) {
	function c(a) {
		if ("string" != typeof a)
			return !1;
		var b = f[a.toLowerCase()];
		return b ? a.toLowerCase() : !1
	}
	function d(a) {
		return "number" == typeof a && a >= 0 && 100 >= a
	}
	function e() {
		var a = 100,
		b = 3,
		e = 0,
		f = 100,
		g = 0,
		h = 100,
		i = "";
		Object.defineProperties(this, {
			width: {
				enumerable: !0,
				get: function () {
					return a
				},
				set: function (b) {
					if (!d(b))
						throw new Error("Width must be between 0 and 100.");
					a = b
				}
			},
			lines: {
				enumerable: !0,
				get: function () {
					return b
				},
				set: function (a) {
					if ("number" != typeof a)
						throw new TypeError("Lines must be set to a number.");
					b = a
				}
			},
			regionAnchorY: {
				enumerable: !0,
				get: function () {
					return f
				},
				set: function (a) {
					if (!d(a))
						throw new Error("RegionAnchorX must be between 0 and 100.");
					f = a
				}
			},
			regionAnchorX: {
				enumerable: !0,
				get: function () {
					return e
				},
				set: function (a) {
					if (!d(a))
						throw new Error("RegionAnchorY must be between 0 and 100.");
					e = a
				}
			},
			viewportAnchorY: {
				enumerable: !0,
				get: function () {
					return h
				},
				set: function (a) {
					if (!d(a))
						throw new Error("ViewportAnchorY must be between 0 and 100.");
					h = a
				}
			},
			viewportAnchorX: {
				enumerable: !0,
				get: function () {
					return g
				},
				set: function (a) {
					if (!d(a))
						throw new Error("ViewportAnchorX must be between 0 and 100.");
					g = a
				}
			},
			scroll: {
				enumerable: !0,
				get: function () {
					return i
				},
				set: function (a) {
					var b = c(a);
					if (b === !1)
						throw new SyntaxError("An invalid or illegal string was specified.");
					i = b
				}
			}
		})
	}
	var f = {
		"": !0,
		up: !0
	};
	a.VTTRegion = a.VTTRegion || e,
	b.VTTRegion = e
}
(this, this.vttjs || {}), function (a) {
	function b(a, b) {
		this.name = "ParsingError",
		this.code = a.code,
		this.message = b || a.message
	}
	function c(a) {
		function b(a, b, c, d) {
			return 3600 * (0 | a) + 60 * (0 | b) + (0 | c) + (0 | d) / 1e3
		}
		var c = a.match(/^(\d+):(\d{2})(:\d{2})?\.(\d{3})/);
		return c ? c[3] ? b(c[1], c[2], c[3].replace(":", ""), c[4]) : c[1] > 59 ? b(c[1], c[2], 0, c[4]) : b(0, c[1], c[2], c[4]) : null
	}
	function d() {
		this.values = o(null)
	}
	function e(a, b, c, d) {
		var e = d ? a.split(d) : [a];
		for (var f in e)
			if ("string" == typeof e[f]) {
				var g = e[f].split(c);
				if (2 === g.length) {
					var h = g[0],
					i = g[1];
					b(h, i)
				}
			}
	}
	function f(a, f, g) {
		function h() {
			var d = c(a);
			if (null === d)
				throw new b(b.Errors.BadTimeStamp, "Malformed timestamp: " + k);
			return a = a.replace(/^[^\sa-zA-Z-]+/, ""),
			d
		}
		function i(a, b) {
			var c = new d;
			e(a, function (a, b) {
				switch (a) {
				case "region":
					for (var d = g.length - 1; d >= 0; d--)
						if (g[d].id === b) {
							c.set(a, g[d].region);
							break
						}
					break;
				case "vertical":
					c.alt(a, b, ["rl", "lr"]);
					break;
				case "line":
					var e = b.split(","),
					f = e[0];
					c.integer(a, f),
					c.percent(a, f) ? c.set("snapToLines", !1) : null,
					c.alt(a, f, ["auto"]),
					2 === e.length && c.alt("lineAlign", e[1], ["start", "middle", "end"]);
					break;
				case "position":
					e = b.split(","),
					c.percent(a, e[0]),
					2 === e.length && c.alt("positionAlign", e[1], ["start", "middle", "end"]);
					break;
				case "size":
					c.percent(a, b);
					break;
				case "align":
					c.alt(a, b, ["start", "middle", "end", "left", "right"])
				}
			}, /:/, /\s/),
			b.region = c.get("region", null),
			b.vertical = c.get("vertical", ""),
			b.line = c.get("line", "auto"),
			b.lineAlign = c.get("lineAlign", "start"),
			b.snapToLines = c.get("snapToLines", !0),
			b.size = c.get("size", 100),
			b.align = c.get("align", "middle"),
			b.position = c.get("position", {
					start: 0,
					left: 0,
					middle: 50,
					end: 100,
					right: 100
				}, b.align),
			b.positionAlign = c.get("positionAlign", {
					start: "start",
					left: "start",
					middle: "middle",
					end: "end",
					right: "end"
				}, b.align)
		}
		function j() {
			a = a.replace(/^\s+/, "")
		}
		var k = a;
		if (j(), f.startTime = h(), j(), "-->" !== a.substr(0, 3))
			throw new b(b.Errors.BadTimeStamp, "Malformed time stamp (time stamps must be separated by '-->'): " + k);
		a = a.substr(3),
		j(),
		f.endTime = h(),
		j(),
		i(a, f)
	}
	function g(a, b) {
		function d() {
			function a(a) {
				return b = b.substr(a.length),
				a
			}
			if (!b)
				return null;
			var c = b.match(/^([^<]*)(<[^>]+>?)?/);
			return a(c[1] ? c[1] : c[2])
		}
		function e(a) {
			return p[a]
		}
		function f(a) {
			for (; o = a.match(/&(amp|lt|gt|lrm|rlm|nbsp);/); )
				a = a.replace(o[0], e);
			return a
		}
		function g(a, b) {
			return !s[b.localName] || s[b.localName] === a.localName
		}
		function h(b, c) {
			var d = q[b];
			if (!d)
				return null;
			var e = a.document.createElement(d);
			e.localName = d;
			var f = r[b];
			return f && c && (e[f] = c.trim()),
			e
		}
		for (var i, j = a.document.createElement("div"), k = j, l = []; null !== (i = d()); )
			if ("<" !== i[0])
				k.appendChild(a.document.createTextNode(f(i)));
			else {
				if ("/" === i[1]) {
					l.length && l[l.length - 1] === i.substr(2).replace(">", "") && (l.pop(), k = k.parentNode);
					continue
				}
				var m,
				n = c(i.substr(1, i.length - 2));
				if (n) {
					m = a.document.createProcessingInstruction("timestamp", n),
					k.appendChild(m);
					continue
				}
				var o = i.match(/^<([^.\s\/0-9>]+)(\.[^\s\\>]+)?([^>\\]+)?(\\?)>?$/);
				if (!o)
					continue;
				if (m = h(o[1], o[3]), !m)
					continue;
				if (!g(k, m))
					continue;
				o[2] && (m.className = o[2].substr(1).replace(".", " ")),
				l.push(o[1]),
				k.appendChild(m),
				k = m
			}
		return j
	}
	function h(a) {
		function b(a, b) {
			for (var c = b.childNodes.length - 1; c >= 0; c--)
				a.push(b.childNodes[c])
		}
		function c(a) {
			if (!a || !a.length)
				return null;
			var d = a.pop(),
			e = d.textContent || d.innerText;
			if (e) {
				var f = e.match(/^.*(\n|\r)/);
				return f ? (a.length = 0, f[0]) : e
			}
			return "ruby" === d.tagName ? c(a) : d.childNodes ? (b(a, d), c(a)) : void 0
		}
		var d,
		e = [],
		f = "";
		if (!a || !a.childNodes)
			return "ltr";
		for (b(e, a); f = c(e); )
			for (var g = 0; g < f.length; g++) {
				d = f.charCodeAt(g);
				for (var h = 0; h < t.length; h++)
					if (t[h] === d)
						return "rtl"
			}
		return "ltr"
	}
	function i(a) {
		if ("number" == typeof a.line && (a.snapToLines || a.line >= 0 && a.line <= 100))
			return a.line;
		if (!a.track || !a.track.textTrackList || !a.track.textTrackList.mediaElement)
			return -1;
		for (var b = a.track, c = b.textTrackList, d = 0, e = 0; e < c.length && c[e] !== b; e++)
			"showing" === c[e].mode && d++;
		return -1 * ++d
	}
	function j() {}
	function k(a, b, c) {
		var d = /MSIE\s8\.0/.test(navigator.userAgent),
		e = "rgba(255, 255, 255, 1)",
		f = "rgba(0, 0, 0, 0.8)";
		d && (e = "rgb(255, 255, 255)", f = "rgb(0, 0, 0)"),
		j.call(this),
		this.cue = b,
		this.cueDiv = g(a, b.text);
		var i = {
			color: e,
			backgroundColor: f,
			position: "relative",
			left: 0,
			right: 0,
			top: 0,
			bottom: 0,
			display: "inline"
		};
		d || (i.writingMode = "" === b.vertical ? "horizontal-tb" : "lr" === b.vertical ? "vertical-lr" : "vertical-rl", i.unicodeBidi = "plaintext"),
		this.applyStyles(i, this.cueDiv),
		this.div = a.document.createElement("div"),
		i = {
			textAlign: "middle" === b.align ? "center" : b.align,
			font: c.font,
			whiteSpace: "pre-line",
			position: "absolute"
		},
		d || (i.direction = h(this.cueDiv), i.writingMode = "" === b.vertical ? "horizontal-tb" : "lr" === b.vertical ? "vertical-lr" : "vertical-rl".stylesunicodeBidi = "plaintext"),
		this.applyStyles(i),
		this.div.appendChild(this.cueDiv);
		var k = 0;
		switch (b.positionAlign) {
		case "start":
			k = b.position;
			break;
		case "middle":
			k = b.position - b.size / 2;
			break;
		case "end":
			k = b.position - b.size
		}
		this.applyStyles("" === b.vertical ? {
			left: this.formatStyle(k, "%"),
			width: this.formatStyle(b.size, "%")
		}
			 : {
			top: this.formatStyle(k, "%"),
			height: this.formatStyle(b.size, "%")
		}),
		this.move = function (a) {
			this.applyStyles({
				top: this.formatStyle(a.top, "px"),
				bottom: this.formatStyle(a.bottom, "px"),
				left: this.formatStyle(a.left, "px"),
				right: this.formatStyle(a.right, "px"),
				height: this.formatStyle(a.height, "px"),
				width: this.formatStyle(a.width, "px")
			})
		}
	}
	function l(a) {
		var b,
		c,
		d,
		e,
		f = /MSIE\s8\.0/.test(navigator.userAgent);
		if (a.div) {
			c = a.div.offsetHeight,
			d = a.div.offsetWidth,
			e = a.div.offsetTop;
			var g = (g = a.div.childNodes) && (g = g[0]) && g.getClientRects && g.getClientRects();
			a = a.div.getBoundingClientRect(),
			b = g ? Math.max(g[0] && g[0].height || 0, a.height / g.length) : 0
		}
		this.left = a.left,
		this.right = a.right,
		this.top = a.top || e,
		this.height = a.height || c,
		this.bottom = a.bottom || e + (a.height || c),
		this.width = a.width || d,
		this.lineHeight = void 0 !== b ? b : a.lineHeight,
		f && !this.lineHeight && (this.lineHeight = 13)
	}
	function m(a, b, c, d) {
		function e(a, b) {
			for (var e, f = new l(a), g = 1, h = 0; h < b.length; h++) {
				for (; a.overlapsOppositeAxis(c, b[h]) || a.within(c) && a.overlapsAny(d); )
					a.move(b[h]);
				if (a.within(c))
					return a;
				var i = a.intersectPercentage(c);
				g > i && (e = new l(a), g = i),
				a = new l(f)
			}
			return e || f
		}
		var f = new l(b),
		g = b.cue,
		h = i(g),
		j = [];
		if (g.snapToLines) {
			var k;
			switch (g.vertical) {
			case "":
				j = ["+y", "-y"],
				k = "height";
				break;
			case "rl":
				j = ["+x", "-x"],
				k = "width";
				break;
			case "lr":
				j = ["-x", "+x"],
				k = "width"
			}
			var m = f.lineHeight,
			n = m * Math.round(h),
			o = c[k] + m,
			p = j[0];
			Math.abs(n) > o && (n = 0 > n ? -1 : 1, n *= Math.ceil(o / m) * m),
			0 > h && (n += "" === g.vertical ? c.height : c.width, j = j.reverse()),
			f.move(p, n)
		} else {
			var q = f.lineHeight / c.height * 100;
			switch (g.lineAlign) {
			case "middle":
				h -= q / 2;
				break;
			case "end":
				h -= q
			}
			switch (g.vertical) {
			case "":
				b.applyStyles({
					top: b.formatStyle(h, "%")
				});
				break;
			case "rl":
				b.applyStyles({
					left: b.formatStyle(h, "%")
				});
				break;
			case "lr":
				b.applyStyles({
					right: b.formatStyle(h, "%")
				})
			}
			j = ["+y", "-x", "+x", "-y"],
			f = new l(b)
		}
		var r = e(f, j);
		b.move(r.toCSSCompatValues(c))
	}
	function n() {}
	var o = Object.create || function () {
		function a() {}
		return function (b) {
			if (1 !== arguments.length)
				throw new Error("Object.create shim only accepts one parameter.");
			return a.prototype = b,
			new a
		}
	}
	();
	b.prototype = o(Error.prototype),
	b.prototype.constructor = b,
	b.Errors = {
		BadSignature: {
			code: 0,
			message: "Malformed WebVTT signature."
		},
		BadTimeStamp: {
			code: 1,
			message: "Malformed time stamp."
		}
	},
	d.prototype = {
		set: function (a, b) {
			this.get(a) || "" === b || (this.values[a] = b)
		},
		get: function (a, b, c) {
			return c ? this.has(a) ? this.values[a] : b[c] : this.has(a) ? this.values[a] : b
		},
		has: function (a) {
			return a in this.values
		},
		alt: function (a, b, c) {
			for (var d = 0; d < c.length; ++d)
				if (b === c[d]) {
					this.set(a, b);
					break
				}
		},
		integer: function (a, b) {
			/^-?\d+$/.test(b) && this.set(a, parseInt(b, 10))
		},
		percent: function (a, b) {
			var c;
			return (c = b.match(/^([\d]{1,3})(\.[\d]*)?%$/)) && (b = parseFloat(b), b >= 0 && 100 >= b) ? (this.set(a, b), !0) : !1
		}
	};
	var p = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&lrm;": "‎",
		"&rlm;": "‏",
		"&nbsp;": " "
	},
	q = {
		c: "span",
		i: "i",
		b: "b",
		u: "u",
		ruby: "ruby",
		rt: "rt",
		v: "span",
		lang: "span"
	},
	r = {
		v: "title",
		lang: "lang"
	},
	s = {
		rt: "ruby"
	},
	t = [1470, 1472, 1475, 1478, 1488, 1489, 1490, 1491, 1492, 1493, 1494, 1495, 1496, 1497, 1498, 1499, 1500, 1501, 1502, 1503, 1504, 1505, 1506, 1507, 1508, 1509, 1510, 1511, 1512, 1513, 1514, 1520, 1521, 1522, 1523, 1524, 1544, 1547, 1549, 1563, 1566, 1567, 1568, 1569, 1570, 1571, 1572, 1573, 1574, 1575, 1576, 1577, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587, 1588, 1589, 1590, 1591, 1592, 1593, 1594, 1595, 1596, 1597, 1598, 1599, 1600, 1601, 1602, 1603, 1604, 1605, 1606, 1607, 1608, 1609, 1610, 1645, 1646, 1647, 1649, 1650, 1651, 1652, 1653, 1654, 1655, 1656, 1657, 1658, 1659, 1660, 1661, 1662, 1663, 1664, 1665, 1666, 1667, 1668, 1669, 1670, 1671, 1672, 1673, 1674, 1675, 1676, 1677, 1678, 1679, 1680, 1681, 1682, 1683, 1684, 1685, 1686, 1687, 1688, 1689, 1690, 1691, 1692, 1693, 1694, 1695, 1696, 1697, 1698, 1699, 1700, 1701, 1702, 1703, 1704, 1705, 1706, 1707, 1708, 1709, 1710, 1711, 1712, 1713, 1714, 1715, 1716, 1717, 1718, 1719, 1720, 1721, 1722, 1723, 1724, 1725, 1726, 1727, 1728, 1729, 1730, 1731, 1732, 1733, 1734, 1735, 1736, 1737, 1738, 1739, 1740, 1741, 1742, 1743, 1744, 1745, 1746, 1747, 1748, 1749, 1765, 1766, 1774, 1775, 1786, 1787, 1788, 1789, 1790, 1791, 1792, 1793, 1794, 1795, 1796, 1797, 1798, 1799, 1800, 1801, 1802, 1803, 1804, 1805, 1807, 1808, 1810, 1811, 1812, 1813, 1814, 1815, 1816, 1817, 1818, 1819, 1820, 1821, 1822, 1823, 1824, 1825, 1826, 1827, 1828, 1829, 1830, 1831, 1832, 1833, 1834, 1835, 1836, 1837, 1838, 1839, 1869, 1870, 1871, 1872, 1873, 1874, 1875, 1876, 1877, 1878, 1879, 1880, 1881, 1882, 1883, 1884, 1885, 1886, 1887, 1888, 1889, 1890, 1891, 1892, 1893, 1894, 1895, 1896, 1897, 1898, 1899, 1900, 1901, 1902, 1903, 1904, 1905, 1906, 1907, 1908, 1909, 1910, 1911, 1912, 1913, 1914, 1915, 1916, 1917, 1918, 1919, 1920, 1921, 1922, 1923, 1924, 1925, 1926, 1927, 1928, 1929, 1930, 1931, 1932, 1933, 1934, 1935, 1936, 1937, 1938, 1939, 1940, 1941, 1942, 1943, 1944, 1945, 1946, 1947, 1948, 1949, 1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1969, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2e3, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2036, 2037, 2042, 2048, 2049, 2050, 2051, 2052, 2053, 2054, 2055, 2056, 2057, 2058, 2059, 2060, 2061, 2062, 2063, 2064, 2065, 2066, 2067, 2068, 2069, 2074, 2084, 2088, 2096, 2097, 2098, 2099, 2100, 2101, 2102, 2103, 2104, 2105, 2106, 2107, 2108, 2109, 2110, 2112, 2113, 2114, 2115, 2116, 2117, 2118, 2119, 2120, 2121, 2122, 2123, 2124, 2125, 2126, 2127, 2128, 2129, 2130, 2131, 2132, 2133, 2134, 2135, 2136, 2142, 2208, 2210, 2211, 2212, 2213, 2214, 2215, 2216, 2217, 2218, 2219, 2220, 8207, 64285, 64287, 64288, 64289, 64290, 64291, 64292, 64293, 64294, 64295, 64296, 64298, 64299, 64300, 64301, 64302, 64303, 64304, 64305, 64306, 64307, 64308, 64309, 64310, 64312, 64313, 64314, 64315, 64316, 64318, 64320, 64321, 64323, 64324, 64326, 64327, 64328, 64329, 64330, 64331, 64332, 64333, 64334, 64335, 64336, 64337, 64338, 64339, 64340, 64341, 64342, 64343, 64344, 64345, 64346, 64347, 64348, 64349, 64350, 64351, 64352, 64353, 64354, 64355, 64356, 64357, 64358, 64359, 64360, 64361, 64362, 64363, 64364, 64365, 64366, 64367, 64368, 64369, 64370, 64371, 64372, 64373, 64374, 64375, 64376, 64377, 64378, 64379, 64380, 64381, 64382, 64383, 64384, 64385, 64386, 64387, 64388, 64389, 64390, 64391, 64392, 64393, 64394, 64395, 64396, 64397, 64398, 64399, 64400, 64401, 64402, 64403, 64404, 64405, 64406, 64407, 64408, 64409, 64410, 64411, 64412, 64413, 64414, 64415, 64416, 64417, 64418, 64419, 64420, 64421, 64422, 64423, 64424, 64425, 64426, 64427, 64428, 64429, 64430, 64431, 64432, 64433, 64434, 64435, 64436, 64437, 64438, 64439, 64440, 64441, 64442, 64443, 64444, 64445, 64446, 64447, 64448, 64449, 64467, 64468, 64469, 64470, 64471, 64472, 64473, 64474, 64475, 64476, 64477, 64478, 64479, 64480, 64481, 64482, 64483, 64484, 64485, 64486, 64487, 64488, 64489, 64490, 64491, 64492, 64493, 64494, 64495, 64496, 64497, 64498, 64499, 64500, 64501, 64502, 64503, 64504, 64505, 64506, 64507, 64508, 64509, 64510, 64511, 64512, 64513, 64514, 64515, 64516, 64517, 64518, 64519, 64520, 64521, 64522, 64523, 64524, 64525, 64526, 64527, 64528, 64529, 64530, 64531, 64532, 64533, 64534, 64535, 64536, 64537, 64538, 64539, 64540, 64541, 64542, 64543, 64544, 64545, 64546, 64547, 64548, 64549, 64550, 64551, 64552, 64553, 64554, 64555, 64556, 64557, 64558, 64559, 64560, 64561, 64562, 64563, 64564, 64565, 64566, 64567, 64568, 64569, 64570, 64571, 64572, 64573, 64574, 64575, 64576, 64577, 64578, 64579, 64580, 64581, 64582, 64583, 64584, 64585, 64586, 64587, 64588, 64589, 64590, 64591, 64592, 64593, 64594, 64595, 64596, 64597, 64598, 64599, 64600, 64601, 64602, 64603, 64604, 64605, 64606, 64607, 64608, 64609, 64610, 64611, 64612, 64613, 64614, 64615, 64616, 64617, 64618, 64619, 64620, 64621, 64622, 64623, 64624, 64625, 64626, 64627, 64628, 64629, 64630, 64631, 64632, 64633, 64634, 64635, 64636, 64637, 64638, 64639, 64640, 64641, 64642, 64643, 64644, 64645, 64646, 64647, 64648, 64649, 64650, 64651, 64652, 64653, 64654, 64655, 64656, 64657, 64658, 64659, 64660, 64661, 64662, 64663, 64664, 64665, 64666, 64667, 64668, 64669, 64670, 64671, 64672, 64673, 64674, 64675, 64676, 64677, 64678, 64679, 64680, 64681, 64682, 64683, 64684, 64685, 64686, 64687, 64688, 64689, 64690, 64691, 64692, 64693, 64694, 64695, 64696, 64697, 64698, 64699, 64700, 64701, 64702, 64703, 64704, 64705, 64706, 64707, 64708, 64709, 64710, 64711, 64712, 64713, 64714, 64715, 64716, 64717, 64718, 64719, 64720, 64721, 64722, 64723, 64724, 64725, 64726, 64727, 64728, 64729, 64730, 64731, 64732, 64733, 64734, 64735, 64736, 64737, 64738, 64739, 64740, 64741, 64742, 64743, 64744, 64745, 64746, 64747, 64748, 64749, 64750, 64751, 64752, 64753, 64754, 64755, 64756, 64757, 64758, 64759, 64760, 64761, 64762, 64763, 64764, 64765, 64766, 64767, 64768, 64769, 64770, 64771, 64772, 64773, 64774, 64775, 64776, 64777, 64778, 64779, 64780, 64781, 64782, 64783, 64784, 64785, 64786, 64787, 64788, 64789, 64790, 64791, 64792, 64793, 64794, 64795, 64796, 64797, 64798, 64799, 64800, 64801, 64802, 64803, 64804, 64805, 64806, 64807, 64808, 64809, 64810, 64811, 64812, 64813, 64814, 64815, 64816, 64817, 64818, 64819, 64820, 64821, 64822, 64823, 64824, 64825, 64826, 64827, 64828, 64829, 64848, 64849, 64850, 64851, 64852, 64853, 64854, 64855, 64856, 64857, 64858, 64859, 64860, 64861, 64862, 64863, 64864, 64865, 64866, 64867, 64868, 64869, 64870, 64871, 64872, 64873, 64874, 64875, 64876, 64877, 64878, 64879, 64880, 64881, 64882, 64883, 64884, 64885, 64886, 64887, 64888, 64889, 64890, 64891, 64892, 64893, 64894, 64895, 64896, 64897, 64898, 64899, 64900, 64901, 64902, 64903, 64904, 64905, 64906, 64907, 64908, 64909, 64910, 64911, 64914, 64915, 64916, 64917, 64918, 64919, 64920, 64921, 64922, 64923, 64924, 64925, 64926, 64927, 64928, 64929, 64930, 64931, 64932, 64933, 64934, 64935, 64936, 64937, 64938, 64939, 64940, 64941, 64942, 64943, 64944, 64945, 64946, 64947, 64948, 64949, 64950, 64951, 64952, 64953, 64954, 64955, 64956, 64957, 64958, 64959, 64960, 64961, 64962, 64963, 64964, 64965, 64966, 64967, 65008, 65009, 65010, 65011, 65012, 65013, 65014, 65015, 65016, 65017, 65018, 65019, 65020, 65136, 65137, 65138, 65139, 65140, 65142, 65143, 65144, 65145, 65146, 65147, 65148, 65149, 65150, 65151, 65152, 65153, 65154, 65155, 65156, 65157, 65158, 65159, 65160, 65161, 65162, 65163, 65164, 65165, 65166, 65167, 65168, 65169, 65170, 65171, 65172, 65173, 65174, 65175, 65176, 65177, 65178, 65179, 65180, 65181, 65182, 65183, 65184, 65185, 65186, 65187, 65188, 65189, 65190, 65191, 65192, 65193, 65194, 65195, 65196, 65197, 65198, 65199, 65200, 65201, 65202, 65203, 65204, 65205, 65206, 65207, 65208, 65209, 65210, 65211, 65212, 65213, 65214, 65215, 65216, 65217, 65218, 65219, 65220, 65221, 65222, 65223, 65224, 65225, 65226, 65227, 65228, 65229, 65230, 65231, 65232, 65233, 65234, 65235, 65236, 65237, 65238, 65239, 65240, 65241, 65242, 65243, 65244, 65245, 65246, 65247, 65248, 65249, 65250, 65251, 65252, 65253, 65254, 65255, 65256, 65257, 65258, 65259, 65260, 65261, 65262, 65263, 65264, 65265, 65266, 65267, 65268, 65269, 65270, 65271, 65272, 65273, 65274, 65275, 65276, 67584, 67585, 67586, 67587, 67588, 67589, 67592, 67594, 67595, 67596, 67597, 67598, 67599, 67600, 67601, 67602, 67603, 67604, 67605, 67606, 67607, 67608, 67609, 67610, 67611, 67612, 67613, 67614, 67615, 67616, 67617, 67618, 67619, 67620, 67621, 67622, 67623, 67624, 67625, 67626, 67627, 67628, 67629, 67630, 67631, 67632, 67633, 67634, 67635, 67636, 67637, 67639, 67640, 67644, 67647, 67648, 67649, 67650, 67651, 67652, 67653, 67654, 67655, 67656, 67657, 67658, 67659, 67660, 67661, 67662, 67663, 67664, 67665, 67666, 67667, 67668, 67669, 67671, 67672, 67673, 67674, 67675, 67676, 67677, 67678, 67679, 67840, 67841, 67842, 67843, 67844, 67845, 67846, 67847, 67848, 67849, 67850, 67851, 67852, 67853, 67854, 67855, 67856, 67857, 67858, 67859, 67860, 67861, 67862, 67863, 67864, 67865, 67866, 67867, 67872, 67873, 67874, 67875, 67876, 67877, 67878, 67879, 67880, 67881, 67882, 67883, 67884, 67885, 67886, 67887, 67888, 67889, 67890, 67891, 67892, 67893, 67894, 67895, 67896, 67897, 67903, 67968, 67969, 67970, 67971, 67972, 67973, 67974, 67975, 67976, 67977, 67978, 67979, 67980, 67981, 67982, 67983, 67984, 67985, 67986, 67987, 67988, 67989, 67990, 67991, 67992, 67993, 67994, 67995, 67996, 67997, 67998, 67999, 68e3, 68001, 68002, 68003, 68004, 68005, 68006, 68007, 68008, 68009, 68010, 68011, 68012, 68013, 68014, 68015, 68016, 68017, 68018, 68019, 68020, 68021, 68022, 68023, 68030, 68031, 68096, 68112, 68113, 68114, 68115, 68117, 68118, 68119, 68121, 68122, 68123, 68124, 68125, 68126, 68127, 68128, 68129, 68130, 68131, 68132, 68133, 68134, 68135, 68136, 68137, 68138, 68139, 68140, 68141, 68142, 68143, 68144, 68145, 68146, 68147, 68160, 68161, 68162, 68163, 68164, 68165, 68166, 68167, 68176, 68177, 68178, 68179, 68180, 68181, 68182, 68183, 68184, 68192, 68193, 68194, 68195, 68196, 68197, 68198, 68199, 68200, 68201, 68202, 68203, 68204, 68205, 68206, 68207, 68208, 68209, 68210, 68211, 68212, 68213, 68214, 68215, 68216, 68217, 68218, 68219, 68220, 68221, 68222, 68223, 68352, 68353, 68354, 68355, 68356, 68357, 68358, 68359, 68360, 68361, 68362, 68363, 68364, 68365, 68366, 68367, 68368, 68369, 68370, 68371, 68372, 68373, 68374, 68375, 68376, 68377, 68378, 68379, 68380, 68381, 68382, 68383, 68384, 68385, 68386, 68387, 68388, 68389, 68390, 68391, 68392, 68393, 68394, 68395, 68396, 68397, 68398, 68399, 68400, 68401, 68402, 68403, 68404, 68405, 68416, 68417, 68418, 68419, 68420, 68421, 68422, 68423, 68424, 68425, 68426, 68427, 68428, 68429, 68430, 68431, 68432, 68433, 68434, 68435, 68436, 68437, 68440, 68441, 68442, 68443, 68444, 68445, 68446, 68447, 68448, 68449, 68450, 68451, 68452, 68453, 68454, 68455, 68456, 68457, 68458, 68459, 68460, 68461, 68462, 68463, 68464, 68465, 68466, 68472, 68473, 68474, 68475, 68476, 68477, 68478, 68479, 68608, 68609, 68610, 68611, 68612, 68613, 68614, 68615, 68616, 68617, 68618, 68619, 68620, 68621, 68622, 68623, 68624, 68625, 68626, 68627, 68628, 68629, 68630, 68631, 68632, 68633, 68634, 68635, 68636, 68637, 68638, 68639, 68640, 68641, 68642, 68643, 68644, 68645, 68646, 68647, 68648, 68649, 68650, 68651, 68652, 68653, 68654, 68655, 68656, 68657, 68658, 68659, 68660, 68661, 68662, 68663, 68664, 68665, 68666, 68667, 68668, 68669, 68670, 68671, 68672, 68673, 68674, 68675, 68676, 68677, 68678, 68679, 68680, 126464, 126465, 126466, 126467, 126469, 126470, 126471, 126472, 126473, 126474, 126475, 126476, 126477, 126478, 126479, 126480, 126481, 126482, 126483, 126484, 126485, 126486, 126487, 126488, 126489, 126490, 126491, 126492, 126493, 126494, 126495, 126497, 126498, 126500, 126503, 126505, 126506, 126507, 126508, 126509, 126510, 126511, 126512, 126513, 126514, 126516, 126517, 126518, 126519, 126521, 126523, 126530, 126535, 126537, 126539, 126541, 126542, 126543, 126545, 126546, 126548, 126551, 126553, 126555, 126557, 126559, 126561, 126562, 126564, 126567, 126568, 126569, 126570, 126572, 126573, 126574, 126575, 126576, 126577, 126578, 126580, 126581, 126582, 126583, 126585, 126586, 126587, 126588, 126590, 126592, 126593, 126594, 126595, 126596, 126597, 126598, 126599, 126600, 126601, 126603, 126604, 126605, 126606, 126607, 126608, 126609, 126610, 126611, 126612, 126613, 126614, 126615, 126616, 126617, 126618, 126619, 126625, 126626, 126627, 126629, 126630, 126631, 126632, 126633, 126635, 126636, 126637, 126638, 126639, 126640, 126641, 126642, 126643, 126644, 126645, 126646, 126647, 126648, 126649, 126650, 126651, 1114109];
	j.prototype.applyStyles = function (a, b) {
		b = b || this.div;
		for (var c in a)
			a.hasOwnProperty(c) && (b.style[c] = a[c])
	},
	j.prototype.formatStyle = function (a, b) {
		return 0 === a ? 0 : a + b
	},
	k.prototype = o(j.prototype),
	k.prototype.constructor = k,
	l.prototype.move = function (a, b) {
		switch (b = void 0 !== b ? b : this.lineHeight, a) {
		case "+x":
			this.left += b,
			this.right += b;
			break;
		case "-x":
			this.left -= b,
			this.right -= b;
			break;
		case "+y":
			this.top += b,
			this.bottom += b;
			break;
		case "-y":
			this.top -= b,
			this.bottom -= b
		}
	},
	l.prototype.overlaps = function (a) {
		return this.left < a.right && this.right > a.left && this.top < a.bottom && this.bottom > a.top
	},
	l.prototype.overlapsAny = function (a) {
		for (var b = 0; b < a.length; b++)
			if (this.overlaps(a[b]))
				return !0;
		return !1
	},
	l.prototype.within = function (a) {
		return this.top >= a.top && this.bottom <= a.bottom && this.left >= a.left && this.right <= a.right
	},
	l.prototype.overlapsOppositeAxis = function (a, b) {
		switch (b) {
		case "+x":
			return this.left < a.left;
		case "-x":
			return this.right > a.right;
		case "+y":
			return this.top < a.top;
		case "-y":
			return this.bottom > a.bottom
		}
	},
	l.prototype.intersectPercentage = function (a) {
		var b = Math.max(0, Math.min(this.right, a.right) - Math.max(this.left, a.left)),
		c = Math.max(0, Math.min(this.bottom, a.bottom) - Math.max(this.top, a.top)),
		d = b * c;
		return d / (this.height * this.width)
	},
	l.prototype.toCSSCompatValues = function (a) {
		return {
			top: this.top - a.top,
			bottom: a.bottom - this.bottom,
			left: this.left - a.left,
			right: a.right - this.right,
			height: this.height,
			width: this.width
		}
	},
	l.getSimpleBoxPosition = function (a) {
		var b = a.div ? a.div.offsetHeight : a.tagName ? a.offsetHeight : 0,
		c = a.div ? a.div.offsetWidth : a.tagName ? a.offsetWidth : 0,
		d = a.div ? a.div.offsetTop : a.tagName ? a.offsetTop : 0;
		a = a.div ? a.div.getBoundingClientRect() : a.tagName ? a.getBoundingClientRect() : a;
		var e = {
			left: a.left,
			right: a.right,
			top: a.top || d,
			height: a.height || b,
			bottom: a.bottom || d + (a.height || b),
			width: a.width || c
		};
		return e
	},
	n.StringDecoder = function () {
		return {
			decode: function (a) {
				if (!a)
					return "";
				if ("string" != typeof a)
					throw new Error("Error - expected string data.");
				return decodeURIComponent(encodeURIComponent(a))
			}
		}
	},
	n.convertCueToDOMTree = function (a, b) {
		return a && b ? g(a, b) : null
	};
	var u = .05,
	v = "sans-serif",
	w = "1.5%";
	n.processCues = function (a, b, c) {
		function d(a) {
			for (var b = 0; b < a.length; b++)
				if (a[b].hasBeenReset || !a[b].displayState)
					return !0;
			return !1
		}
		if (!a || !b || !c)
			return null;
		for (; c.firstChild; )
			c.removeChild(c.firstChild);
		var e = a.document.createElement("div");
		if (e.style.position = "absolute", e.style.left = "0", e.style.right = "0", e.style.top = "0", e.style.bottom = "0", e.style.margin = w, c.appendChild(e), d(b)) {
			var f = [],
			g = l.getSimpleBoxPosition(e),
			h = Math.round(g.height * u * 100) / 100,
			i = {
				font: h + "px " + v
			};
			!function () {
				for (var c, d, h = 0; h < b.length; h++)
					d = b[h], c = new k(a, d, i), e.appendChild(c.div), m(a, c, g, f), d.displayState = c.div, f.push(l.getSimpleBoxPosition(c))
			}
			()
		} else
			for (var j = 0; j < b.length; j++)
				e.appendChild(b[j].displayState)
	},
	n.Parser = function (a, b, c) {
		c || (c = b, b = {}),
		b || (b = {}),
		this.window = a,
		this.vttjs = b,
		this.state = "INITIAL",
		this.buffer = "",
		this.decoder = c || new TextDecoder("utf8"),
		this.regionList = []
	},
	n.Parser.prototype = {
		reportOrThrowError: function (a) {
			if (!(a instanceof b))
				throw a;
			this.onparsingerror && this.onparsingerror(a)
		},
		parse: function (a) {
			function c() {
				for (var a = i.buffer, b = 0; b < a.length && "\r" !== a[b] && "\n" !== a[b]; )
					++b;
				var c = a.substr(0, b);
				return "\r" === a[b] && ++b,
				"\n" === a[b] && ++b,
				i.buffer = a.substr(b),
				c
			}
			function g(a) {
				var b = new d;
				if (e(a, function (a, c) {
						switch (a) {
						case "id":
							b.set(a, c);
							break;
						case "width":
							b.percent(a, c);
							break;
						case "lines":
							b.integer(a, c);
							break;
						case "regionanchor":
						case "viewportanchor":
							var e = c.split(",");
							if (2 !== e.length)
								break;
							var f = new d;
							if (f.percent("x", e[0]), f.percent("y", e[1]), !f.has("x") || !f.has("y"))
								break;
							b.set(a + "X", f.get("x")),
							b.set(a + "Y", f.get("y"));
							break;
						case "scroll":
							b.alt(a, c, ["up"])
						}
					}, /=/, /\s/), b.has("id")) {
					var c = new(i.vttjs.VTTRegion || i.window.VTTRegion);
					c.width = b.get("width", 100),
					c.lines = b.get("lines", 3),
					c.regionAnchorX = b.get("regionanchorX", 0),
					c.regionAnchorY = b.get("regionanchorY", 100),
					c.viewportAnchorX = b.get("viewportanchorX", 0),
					c.viewportAnchorY = b.get("viewportanchorY", 100),
					c.scroll = b.get("scroll", ""),
					i.onregion && i.onregion(c),
					i.regionList.push({
						id: b.get("id"),
						region: c
					})
				}
			}
			function h(a) {
				e(a, function (a, b) {
					switch (a) {
					case "Region":
						g(b)
					}
				}, /:/)
			}
			var i = this;
			a && (i.buffer += i.decoder.decode(a, {
					stream: !0
				}));
			try {
				var j;
				if ("INITIAL" === i.state) {
					if (!/\r\n|\n/.test(i.buffer))
						return this;
					j = c();
					var k = j.match(/^WEBVTT([ \t].*)?$/);
					if (!k || !k[0])
						throw new b(b.Errors.BadSignature);
					i.state = "HEADER"
				}
				for (var l = !1; i.buffer; ) {
					if (!/\r\n|\n/.test(i.buffer))
						return this;
					switch (l ? l = !1 : j = c(), i.state) {
					case "HEADER":
						/:/.test(j) ? h(j) : j || (i.state = "ID");
						continue;
					case "NOTE":
						j || (i.state = "ID");
						continue;
					case "ID":
						if (/^NOTE($|[ \t])/.test(j)) {
							i.state = "NOTE";
							break
						}
						if (!j)
							continue;
						if (i.cue = new(i.vttjs.VTTCue || i.window.VTTCue)(0, 0, ""), i.state = "CUE", -1 === j.indexOf("-->")) {
							i.cue.id = j;
							continue
						}
					case "CUE":
						try {
							f(j, i.cue, i.regionList)
						} catch (m) {
							i.reportOrThrowError(m),
							i.cue = null,
							i.state = "BADCUE";
							continue
						}
						i.state = "CUETEXT";
						continue;
					case "CUETEXT":
						var n = -1 !== j.indexOf("-->");
						if (!j || n && (l = !0)) {
							i.oncue && i.oncue(i.cue),
							i.cue = null,
							i.state = "ID";
							continue
						}
						i.cue.text && (i.cue.text += "\n"),
						i.cue.text += j;
						continue;
					case "BADCUE":
						j || (i.state = "ID");
						continue
					}
				}
			} catch (m) {
				i.reportOrThrowError(m),
				"CUETEXT" === i.state && i.cue && i.oncue && i.oncue(i.cue),
				i.cue = null,
				i.state = "INITIAL" === i.state ? "BADWEBVTT" : "BADCUE"
			}
			return this
		},
		flush: function () {
			var a = this;
			try {
				if (a.buffer += a.decoder.decode(), (a.cue || "HEADER" === a.state) && (a.buffer += "\n\n", a.parse()), "INITIAL" === a.state)
					throw new b(b.Errors.BadSignature)
			} catch (c) {
				a.reportOrThrowError(c)
			}
			return a.onflush && a.onflush(),
			this
		}
	},
	a.WebVTT = n
}
(this, this.vttjs || {});
//# sourceMappingURL=video.min.js.map
