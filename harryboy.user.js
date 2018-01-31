// ==UserScript==
// @name         Harry Boy
// @namespace    https://adamandreasson.se/
// @version      1.1.3
// @description  Vinn på travet med Harry Boy! PS. Du måste synka med discord för att få notifikationer när saker händer, skriv !travet [travian namn] i #memes chatten
// @author       Adam Andreasson
// @match        https://tx3.travian.se/*
// @grant        GM_setValue
// @grant        GM_getValue
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @downloadURL  https://adamandreasson.se/harryboy/harryboy.user.js
// ==/UserScript==

$.noConflict();

(function() {

    Date.prototype.toString = function() {
        return [this.getHours(), this.getMinutes(), this.getSeconds()]
                    .map(n => n > 9 ? n : "0" + n)
                    .join(":");
    }

    function DomAdapter(){

        var resourceNames = ["","Trä","Lera","Järn","Vete"];

        function toNumbersOnly(str){
            return parseInt(str.replace(/[^0-9.\-]/g, ""));
        }

        function getTimeFromString(str){
            var timeSplit = str.split(":");
            var date = new Date();
            date.setHours(timeSplit[0].replace(/[^0-9.]/g, ""));
            date.setMinutes(timeSplit[1].replace(/[^0-9.]/g, ""));
            date.setSeconds(timeSplit[2].replace(/[^0-9.]/g, ""));

            if(date.getTime() < Date.now()){
                date.setTime(date.getTime() + 1000*60*60*24);
            }

            return Math.floor(date.getTime()/1000);
        }

        function formatResources(resources){
            var split = resources.split(" ");


            var str = "";

            for(var i = 1; i < split.length; i++){
                if(split[i] != "0")
                    str += split[i] + " " +resourceNames[i] + " ";
            }

            return str;
        }

        function TradeRouteFactory(opts, minHour, maxHour) {
            var self = this;
            this.opts = opts;
            this.hour = minHour;
            this.maxHour = maxHour;

            this.start = function(){
                jQuery(".hb-trade-route").prop("disabled", true);
                tick();
            }

            function tick(){
                if (self.hour > self.maxHour) {
                    window.location.href = "/build.php?gid=17&t=0";
                    return;
                }

                jQuery(".hb-trade-route").html("Skapar handelsvägar... " + self.hour);
                self.opts.userHour = self.hour++;

                jQuery.post("/build.php", self.opts);

                setTimeout(tick, hb.getRandomDelay(3000, 800));
            }
        }

        this.goToFields = function(){
            window.location.href = "/dorf1.php";
        };

        this.goToUrl = function(url){
            window.location.href = url;
        };

        this.getUser = function(){
            return jQuery('.playerName').text().replace(/[\t\n\r]/gm,'').trim();
        };

        this.attemptLogin = function(user, pass){
            if(user == null || user == "")
                return;

            if(jQuery(".outerLoginBox").length > 0){
                setTimeout(function(){
                    console.log("we can login");
                    console.log("eyy", jQuery('tr.account input').val());
                    jQuery('tr.account input').val(user);
                    jQuery('tr.pass input').val(pass);

                    setTimeout(function(){
                        jQuery(".outerLoginBox #s1").trigger('click');
                        console.log("logging in....");
                    },1700);

                },2000);
            }

        };

        this.changeVillage = function(village){
            jQuery("div#sidebarBoxVillagelist .content li").each(function(){
                var name = jQuery(this).find(".name").text();
                var url = jQuery(this).find("a").attr("href");

                if(name == village){
                    window.location.href = url;
                    return;
                }
            });
        };

        this.getAttackDetails = function(){

            if(!(window.location.href.includes("build.php") && window.location.href.includes("gid=16")))
                return null;

            var hostileAttacks = [];

            jQuery("table.troop_details").each(function(){
                if(jQuery(this).hasClass("inRaid") || jQuery(this).hasClass("inAttack") || jQuery(this).hasClass("inRaidOasis")){
                    var attackingVillage = jQuery(this).find("td.role").text();
                    attackingVillage = attackingVillage.replace(/[\t\n\r]/gm,'');
                    var attackTime = jQuery(this).find("tbody.infos .at").text();
                    var type = "ATTACK";
                    if(jQuery(this).hasClass("inRaid"))
                        type = "RAID";


                    var timeUnix = getTimeFromString(attackTime);
                    hostileAttacks.push({"type": type, "from": attackingVillage, "time": timeUnix});
                }
            });

            return hostileAttacks;

        };

        this.getMovementList = function(){
            var list = [];

            if(!window.location.href.includes("dorf1.php"))
                return null;

            jQuery("#map_details table#movements tr .typ").each(function(){
                var type = "UNKNOWN";
                if(jQuery(this).find("img").hasClass("att1"))
                    type = "ATTACK";
                if(jQuery(this).find("img").hasClass("att2"))
                    type = "ATTACK_SELF";
                if(jQuery(this).find("img").hasClass("att3"))
                    type = "ATTACK_OUT";

                var url = jQuery(this).find("a").attr("href");

                list.push({"type": type, "url": url});
            });
            return list;
        };

        this.getVillageList = function(){
            var list = [];

            jQuery("div#sidebarBoxVillagelist .content li").each(function(){
                var id = jQuery(this).children().first().attr("href").match(/newdid=(\d+)/)[1];
                var name = jQuery(this).find(".name").text();
                var coords = jQuery(this).find(".coordinates").text().replace(/\(|\)/g, "").split("|");
                coords = {x: coords[0], y: coords[1]};
                var attackComing = jQuery(this).hasClass("attack");
                list.push({"id": id, "name": name, "coords": coords, "attack": attackComing});
            });
            return list;
        };

        this.getActiveVillageName = function(){
            return jQuery("div#sidebarBoxActiveVillage #villageNameField").text();
        };

        this.getActiveVillageId = function(){
            if(jQuery("div#sidebarBoxVillagelist .content li.active a").length < 1)
                return null;
            return jQuery("div#sidebarBoxVillagelist .content li.active a").attr("href").match(/newdid=(\d+)/)[1];
        };

        this.getProductionNumbers = function(){

            var resources = [];
            jQuery("#map_details table#production tbody tr").each(function(){
                resources.push(toNumbersOnly(jQuery(this).find(".num").text()));
            });
            return resources;

        };

        this.addTradeRouteMenu = function(){
            var dom = '<div style="border:1px solid #ccc; padding:5px">';
            dom += '🦊 Skapa handelsväg för varje timma mellan ';
            dom += '<select id="minHour"></select> och ';
            dom += '<select id="maxHour"></select> <button style="border:1px solid #ccc; padding:2px; margin-right:10px;" class="hb-trade-route">Skapa</button>';
            dom += '</div>';

            jQuery("#tradeRouteEdit").append(dom);
            jQuery("#userHour option").clone().appendTo("#minHour");
            jQuery("#userHour option").clone().appendTo("#maxHour");

            jQuery("body").on("click", ".hb-trade-route", function(event){
                event.preventDefault();

                var minHour = parseInt(jQuery("#minHour").val());
                var maxHour = parseInt(jQuery("#maxHour").val());

                if (minHour > maxHour)
                    return alert('Hallå nu har du valt konstiga timmar');

                var opts = {};
                ['did_dest', 'r1', 'r2', 'r3', 'r4', 'repeat', 'gid', 'a', 't', 'trid', 'option']
                        .forEach(name => opts[name] = jQuery("[name='"+name+"']").val());

                if (opts.r1 == '0' && opts.r2 == '0' && opts.r3 == '0' && opts.r4 == '0')
                    return alert('Hallå du måste välja några råvaror också');

                new TradeRouteFactory(opts, minHour, maxHour).start();
            });
        };

        this.addCountdownAlarmButtons = function(){

            //why make it compliccat even ezier to debug this wae
            function getAlertHash(name, goalTime){
                return name+"|"+Math.round(goalTime/10);
            }

            jQuery(".timer[counting=down]").each(function(){

                var timerName = "okänd timer";

                if(jQuery(this).closest(".buildingList").length > 0){
                    timerName = jQuery.trim(jQuery(this).parent().parent().children(".name").text());
                    timerName = timerName.replace("Nivå", " Nivå");
                }

                if(jQuery(this).closest("#movements").length > 0){
                    timerName = jQuery.trim(jQuery(this).parent().parent().children(".mov").text());
                }

                if(jQuery(this).closest("table.traders").length > 0){
                    timerName = jQuery.trim(jQuery(this).closest("table.traders").find(".dorf").text());
                    timerName = "Köpmän " + timerName;

                    var resources = jQuery(this).closest("table.traders").find("tr.res td span").text();

                    resources = resources.replace(/\t/g, "");

                    resources = formatResources(resources);

                    timerName = timerName + " med " + resources;

                }

                timerName = timerName.replace(/\t/g, "");

                var timerValue = parseInt(jQuery(this).attr("value"));
                var currentTime = Math.floor(Date.now() / 1000);
                var goalTime = currentTime + timerValue;
                var villageName = jQuery("#villageNameField").text();
                var name = villageName + ', ' + timerName;

                var content = '🦊';

                var alertLog = hb.getAlertLog();
                for(var i = 0; i < alertLog.length; i++){
                    console.log(alertLog[i].hash, "|||", getAlertHash(name,goalTime));
                    if(alertLog[i].hash == getAlertHash(name,goalTime))
                        content = '✓';
                }

                jQuery(this).parent().append('<button class="harryBoyStart" style="padding:2px;" hbGoal="'+goalTime+'" hbName="'+name+'">'+content+'</button>');
            });

            jQuery("body").on("click", ".harryBoyStart", function(event){
                if (jQuery(this).text() == "✓")
                    return;

                jQuery(this).text("✓");
                var name = jQuery(this).attr("hbName");
                var goal = jQuery(this).attr("hbGoal");
                console.log("name", name, "goal", goal, "user", hb.user);

                hb.plebbeAlerter.sendAlert(hb.user, name, goal);
                hb.addAlertLog({"time": Date.now(), "hash": getAlertHash(name, goal)});

                event.preventDefault();
                return false;

            });

        };

        this.addInfoWindow = function(){
            var dom = '<div class="hb-info" style="position:fixed; bottom:0; right:0; background: #222; color: #fff; padding:10px; z-index:100; width:300px;">';
            dom += '</div>';

            jQuery("body").append(dom);

            this.redrawInfoWindow();

            jQuery("body").on("click", ".hb-activate-sitter", function(event){
                var mode = jQuery(this).attr("sitterMode");
                hb.toggleSitter(mode);
                event.preventDefault();
                return false;
            });

            jQuery("body").on("click", ".hb-sitter-queue", function(event){
                var troops = jQuery(this).attr("hbTroop");
                var troopName = jQuery(this).attr("hbTroopName");
                var village = jQuery(this).attr("hbVillage");
                hb.toggleSitterTroops(troops, troopName, village);
                event.preventDefault();
                return false;
            });

            jQuery("body").on("click", ".hb-action-remove", function(event){
                var actionIndex = jQuery(this).attr("hbAction");
                hb.dropAction(actionIndex);
                event.preventDefault();
                return false;
            });
        };

        this.redrawInfoWindow = function(){

            var dom = '🦊 Harry Boy';
            dom += '<div class="hb-status" style="color:#ddd;font-size:0.9em;">'+hb.status+'</div>';

            for(var i = 0; i < hb.persistentData.actionQueue.length; i++){
                var action = hb.persistentData.actionQueue[i];
                var villageName = '??';
                if(action.village != null)
                    villageName = hb.getVillageById(action.village).name || '???';
                var content = '' + action.type + ' / '+villageName+ '<br />';
                var customLook = 'border:1px solid #444;background:#333;';
                if(action.type == "SEND_TROOPS"){
                    customLook = 'border:1px solid #0D3B4A;background:#092C38;';
                    content = 'Trupper skickas från '+villageName+'<br>Mål: '+action.targetName+'<br />landar kl ' + new Date(action.strikeTime*1000).toString() + '';
                }
                dom += '<div style="'+customLook+'margin:2px 0;padding:5px;"><button class="hb-action-remove" hbAction="'+i+'" style="color:#e00; padding:2px; margin-right:10px;">x</button><span style="color:#ddd;">kl ' + new Date(action.time).toString() + '</span><br>';

                dom += content;

                dom += '</div>';
            }

            for(var i = 0; i < hb.persistentData.activities.length; i++){
                var activity = hb.persistentData.activities[i];
                var villageName = hb.getVillageById(activity.village).name || '???';
                if(activity.type == "ATTACK" || activity.type == "RAID")
                    dom += '<div style="border:1px solid #cc0;padding:5px;">' + activity.type + ' i '+villageName+'<br />från ' + activity.from + '<br />kl ' + new Date(activity.time*1000).toString() + '</div>';
                else
                    dom += '<div style="border:1px solid #0c0;padding:5px;">' + activity.type + ' i '+villageName+ '<br />kl ' + new Date(activity.time*1000).toString() + '</div>';
            }

            dom += '<div class="hb-options" style="background:#1a1a1a;padding:5px;">Rävsitter i mode '+hb.persistentData.sitter.mode+'<br>';

            if(hb.persistentData.sitter.mode == "ACTIVE"){
                dom += '<div class="hb-building">';
            }else{
                dom += '<div class="hb-building" style="color: #888;">';
            }

            for(var i = 0; i < hb.persistentData.sitter.buildTroops.length; i++){
                var troopData = hb.persistentData.sitter.buildTroops[i];
                var villageName = hb.getVillageById(troopData.village).name || '???';
                var est = "";
                if('estimate' in troopData && troopData.estimate !== null){
                    var estMinutes = (troopData.estimate - Date.now())/60/1000;
                    if(estMinutes < 0)
                        estMinutes = 0;
                    est = '(om ca '+estMinutes.toFixed(1) + " min)";
                }
                dom += (i+1) + '. Kommer bygga '+troopData.name+' i ' + villageName + ' <button class="hb-sitter-queue" hbTroop="'+troopData.type+'" hbTroopName="'+troopData.name+'" hbVillage="'+troopData.village+'" style="color:#e00; padding:2px; margin-right:10px;">x</button> '+est+'<br>';
            }

            dom += '</div>';

            if(hb.persistentData.sitter.mode == "ACTIVE"){
                dom += '<button class="hb-activate-sitter" sitterMode="ACTIVE" style="background:#99c01a;border:#000;padding:5px;">Stoppa aktiv räv</button> ';
            }else{
                dom += '<button class="hb-activate-sitter" sitterMode="ACTIVE" style="background:#fff;border:#000;padding:5px;">Starta aktiv räv</button> ';
            }

            if(hb.persistentData.sitter.mode == "PASSIVE"){
                dom += '<button class="hb-activate-sitter" sitterMode="PASSIVE" style="background:#99c01a;border:#000;padding:5px;">Stoppa passiv räv</button>';
            }else{
                dom += '<button class="hb-activate-sitter" sitterMode="PASSIVE" style="background:#fff;border:#000;padding:5px;">Starta passiv räv</button>';
            }

            dom += '</div>';
            jQuery(".hb-info").html(dom);
        };


        this.addTroopSitterButtons = function(){

            if(jQuery("form .buildActionOverview").length > 0){

                jQuery(".trainUnits .action").each(function(){
                    var troopFullName =  jQuery(this).find('.bigUnitSection img.unitSection').attr("alt");

                    var troopName =  jQuery(this).find('.details input[type=text]').attr("name");

                    var foxButton = '<button class="hb-sitter-queue" hbActive="nope" hbTroop="'+troopName+'" hbTroopName="'+troopFullName
                            +'" hbVillage="'+hb.activeVillage.id+'" style="border:1px solid #ccc; padding:2px; margin-right:10px;">🦊 Köa hos rävsitter</button>';

                    jQuery(this).find('.details').append(foxButton);
                });

            }

        };

        this.addAttackScheduler = function(){

            if(jQuery("#build.gid16 #rallyPointButtonsContainer").length < 1)
                return;

            var dom = '<div class="hb-troop-sender" style="border:1px solid #ccc; padding:5px; display:inline-block;">';
            dom += '🦊 Schemalägg så trupperna kommer fram ';
            dom += '<input type="text" class="hb-troop-sendtime" value="00:00:00" style="width:80px;"> <button style="border:1px solid #ccc; padding:2px; margin-right:10px;" class="hb-troop-schedule">Spara</button>';
            dom += '</div>';

            jQuery("#build.gid16 form").append(dom);

            jQuery("body").on("click", ".hb-troop-schedule", function(event){
                var rawTime = jQuery(".hb-troop-sendtime").val();

                var attackData = {};

                jQuery(this).closest("form").find("input").each(function(){

                    if(jQuery(this).attr("name") == null)
                        return;

                    if(jQuery(this).attr("name").length < 4 && jQuery(this).attr("name").charAt(0) == "t"){
                        attackData[jQuery(this).attr("name")] = jQuery(this).val();
                    }

                    if(jQuery(this).attr("name") == "x" || jQuery(this).attr("name") == "y" || jQuery(this).attr("name") == "dname" || jQuery(this).attr("name") == "c"){
                        attackData[jQuery(this).attr("name")] = jQuery(this).val();
                    }

                });

                var targetName = jQuery("#short_info tr td").text();
                targetName = targetName.replace(/[\t\n\r]/gm,'');
                console.log(targetName);

                var inRaw = jQuery(".troop_details .infos .in").text();

                var inSplit = inRaw.split(":");

                var inHours = toNumbersOnly(inSplit[0]);
                var inMinutes = toNumbersOnly(inSplit[1]);
                var inSeconds = toNumbersOnly(inSplit[2]);

                var troopTravelTime = inHours*60*60 + inMinutes*60 + inSeconds;

                var timeSplit = rawTime.split(":");
                if(timeSplit.length != 3 || rawTime.length != 8){
                    alert("nu gör du fel.... formatet e ju hh:mm:ss");
                    event.preventDefault();
                    return false;
                }
                var strikeTime = getTimeFromString(rawTime);
                var targetTime = strikeTime - troopTravelTime;
                console.log(new Date(targetTime*1000).toString());

                hb.scheduleAttack(targetTime, strikeTime, targetName, attackData);
                event.preventDefault();
                return false;
            });

        };

        this.addVillageSelector = function(villages){
            if (jQuery(".destination .coordinatesInput").length > 0) {
                var dom = '<div class="clear"></div><div class="hb-village-sel" style="margin-top: 5px">';
                for (var i = 0; i < villages.length; i++) {
                    dom += '<button x="' + villages[i].coords.x + '" y="' + villages[i].coords.y + '" name="' + villages[i].name + '" style="display:block;background:#fff;width:50%;padding:3px;margin-top:1px;line-height:1;">' + villages[i].name + '</button>';
                }
                dom += '</div>';

                jQuery(dom).insertAfter(".coordinatesInput");

                const domAdapter = this;
                jQuery("body").on("click", ".hb-village-sel button", function(event){
                    event.preventDefault();

                    var village = jQuery(this);
                    var x = village.attr("x");
                    var y = village.attr("y");
                    var name = village.attr("name");

                    if (x || y || name) {
                        //domAdapter.simulateInput(document.getElementById("xCoordInput"), x);
                        //domAdapter.simulateInput(document.getElementById("yCoordInput"), y);
                        domAdapter.simulateInput(document.getElementById("enterVillageName"), name);
                    }

                    return false;
                });
            }
        };

        this.formatStats = function(){
            if (window.location.href.includes("statistiken.php")) {
                jQuery("td.pop,td.po,td.val,td.xp").each(function(){
                    var number = toNumbersOnly(jQuery(this).text());
                    jQuery(this).html(number.toLocaleString());
                });
            }
        };

        this.simulateInput = function(element, text){
            element.dispatchEvent(new KeyboardEvent("keydown"));
            element.dispatchEvent(new KeyboardEvent("keypress"));
            element.dispatchEvent(new KeyboardEvent("keyup"));

            element.value = text;
            element.dispatchEvent(new InputEvent("change"));
        };

        this.buildTroopsAttempt = function(troopData){

            var maxAmount = -1;

            if(jQuery("form .buildActionOverview").length > 0){

                jQuery(".trainUnits .action").each(function(){

                    var troopName =  jQuery(this).find('.details input[type=text]').attr("name");

                    if(troopName == troopData.type){

                        maxAmount =  jQuery(this).find('.details').text();
                        maxAmount = maxAmount.slice(maxAmount.indexOf("Antal"));
                        maxAmount = parseInt(maxAmount.replace(/[^0-9.]/g, ""));

                        console.log("troopname", troopName, "max", maxAmount);

                        if(maxAmount > 1){
                            jQuery(this).find('.details input[type=text]').val(maxAmount);
                        }

                    }

                });

            }

            return maxAmount;

        };

        this.buildTroopsCommit = function(){
            jQuery("#build form[name=snd]").submit();
        };

        this.getFullStocks = function(){

            var fullStocks = [];

                jQuery("ul#stockBar li").each(function(){

                    if(jQuery(this).find('.barBox .bar').hasClass("stockFull")){
                        console.log("yep, is full");
                        var resource = resourceNames[toNumbersOnly(jQuery(this).attr("id"))];
                        var amount = parseInt(toNumbersOnly(jQuery(this).find('span.value').text()));
                        fullStocks.push({"name": resource, "amount" : amount});
                    }

                });


            return fullStocks;

        };

        this.addFoxSettings = function(){
            var dom = '<div class="hb-settings">';
            dom += 'vänta mellan uppdateringar(aktiv räv) <input type="number" class="hb-setting" style="width:40px;" setting="pacetime" value="'+hb.persistentData.options.pacetime+'"> min<br>';
            dom += 'vänta mellan trupp bygge(aktiv räv) <input type="number" class="hb-setting" style="width:40px;" size="5" setting="trooptime" value="'+hb.persistentData.options.trooptime+'"> min<br>';
            dom += 'auto login namn <input type="text" class="hb-setting" style="width:90px;" setting="savedUsername" value="'+hb.persistentData.options.savedUsername+'"><br>';
            dom += 'auto login pass <input type="password" class="hb-setting" style="width:90px;" setting="savedPassword" value="'+hb.persistentData.options.savedPassword+'"><br>';
            dom += '</div>';

            jQuery("#footer").append(dom);

            this.redrawInfoWindow();

            jQuery("body").on("blur", ".hb-setting", function(event){
                var setting = jQuery(this).attr("setting");
                var val = jQuery(this).val();
                hb.updateOption(setting, val);
                console.log(setting, val);
                event.preventDefault();
                return false;
            });

        };

        this.sendTroops = function(action){

            if(action.stage == "START" || action.stage == "PREPARE"){

                console.log("prepare troops", action);

                if(window.location.href != action.url){
                    action.time += 1000;
                    action.stage = "PREPARE";
                    hb.queueAction(action);
                    this.goToUrl(action.url);
                    return;
                }

                for(var domName in action.attackData){
                    console.log(domName);
                    var val = action.attackData[domName];
                    if(val != "" && val != 0)
                        jQuery("input[name="+domName+"]").val(val);
                }
                action.stage = "SEND";
                action.time = action.sendTime;
                hb.queueAction(action);

                setTimeout(function(){
                    jQuery("form button[name=s1]").trigger('click');
                }, 200);

            }else{

                console.log("send troops", action);

                if(jQuery("#build.gid16 #rallyPointButtonsContainer").length < 1){
                    hb.plebbeAlerter.sendAlert(hb.user, "Kunde inte skicka attack ://", 0);
                    return;
                }

                jQuery(".a2b form").append('<div style="font-size:20px;color:#f00;font-weight:bold;">SKICKAR TRUPPER VILKEN SEKUND SOM HELST NU!!!</div>');

                var actualArrivalTime = getTimeFromString(jQuery(".troop_details .infos .timer").text());
                var wait = (action.strikeTime - actualArrivalTime);
                setTimeout(function(){
                    console.log("REEEEE");
                    jQuery("#rallyPointButtonsContainer button[name=s1]").trigger('click');
                }, wait*1000 - 1550);

            }

        };

    }

    function PlebbeAlerter(){

        this.sendAlert = function(user, message, targetTime){

            user.trim();

            jQuery.ajax({
                url: 'https://adamandreasson.se/travet.php?user='+encodeURIComponent(user)+'&message='+encodeURIComponent(message)+'&goal='+targetTime,
                type: 'GET',
                success: function(data){
                    console.log("YUP!", data);

                },
                error: function(jqXHR, textStatus, errorThrown){
                    console.error("FAK");
                }

            });

        };

    }

    function HarryBoy(){
        this.domAdapter = new DomAdapter();
        this.plebbeAlerter = new PlebbeAlerter();
        this.activeVillage = null;
        this.persistentData = null;
        this.user = null;
        this.status = "chillar";
        this.nextUpdate = null;
        this.counterInterval = null;

        function randomGauss() {
            var u = 0, v = 0;
            while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
            while(v === 0) v = Math.random();
            return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
        }

        this.getRandomTime = function(target, deviation){
            return Math.round(Date.now() + Math.abs(target + randomGauss()*deviation));
        };

        this.getRandomTimeBeforeTime = function(target, deviation, time){
            return Math.round(time - Math.abs(target + randomGauss()*deviation));
        };

        this.getRandomDelay = function(delay, deviation){
            return Math.round(Math.abs(delay + randomGauss()*deviation));
        }

        this.getAlertLog = function(){
            return this.persistentData.alerts;
        };

        this.addAlertLog = function(entry){
            this.persistentData.alerts.push(entry);

            var nowRounded = Math.round(Date.now() / 10000);
            this.persistentData.alerts = this.persistentData.alerts.filter(alert => {
                var goalTime = alert.hash.match(/\|(\d+)/)[1];
                return goalTime > nowRounded;
            });

            this.saveData();
        };

        this.setStatus = function(status){
            this.status = status;
            this.domAdapter.redrawInfoWindow();
        };

        this.saveData = function(){
            GM_setValue('harryBoyP', this.persistentData);
        };

        this.getVillageByName = function(name){
            var villages = this.persistentData.villages;
            for(var v in villages){
                if(villages[v].name == name)
                    return villages[v];
            }
            return null;
        };

        this.getVillageById = function(id) {
            return this.persistentData.villages.find(v => v.id == id);
        };

        this.queueActionFirst = function(action){
            var time = Date.now();

            if(this.persistentData.actionQueue.length > 0){
                var nextAction = this.persistentData.actionQueue[0];
                time = this.getRandomTimeBeforeTime(3*1000, 2*100, nextAction.time);
            }

            action.time = time;

            this.queueAction(action);

        };

        this.queueAction = function(action){

            for(var i in this.persistentData.actionQueue){
                var otherAction = this.persistentData.actionQueue[i];
                if(otherAction.type == action.type && otherAction.village == action.village && action.type != "SEND_TROOPS")
                    return;
            }

            this.persistentData.actionQueue.push(action);
            this.persistentData.actionQueue.sort(function(a,b) {return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);} );
            this.saveData();
        };


        this.updateVillages = function(){
            var foundVillages = this.domAdapter.getVillageList();

            for(var i = 0; i < foundVillages.length; i++){
                var newVillage = foundVillages[i];
                var pVillage = this.getVillageById(newVillage.id);

                if(pVillage == null){

                    console.log("found a new village!");
                    this.persistentData.villages.push(newVillage);

                }else{
                    pVillage.attack = newVillage.attack;
                    pVillage.name = newVillage.name;
                }

            }
            this.saveData();

            var activeVillageId = this.domAdapter.getActiveVillageId();
            if(activeVillageId != null)
                this.activeVillage = this.getVillageById(activeVillageId);
        };

        this.updateProductionNumbers = function(){
            var numbers = this.domAdapter.getProductionNumbers();
            if(numbers.length === 0)
                return;
            console.log("production", numbers);
            this.activeVillage.production = {"updated": Date.now(), "numbers": numbers};
            this.saveData();
        };

        this.getAttackByVillage = function(village){
            for(var a in this.persistentData.activities){
               var activity = this.persistentData.activities[a];
                if(activity.village == village.id && (activity.type == "ATTACK" || activity.type == "RAID")){
                    return activity;
                }
            }
            return null;
        };

        this.addAttackData = function(data){
            for(var a in this.persistentData.activities){
               var activity = this.persistentData.activities[a];
                if(activity.villageName == data.village && activity.type == data.type && activity.time == data.time){
                    return false;
                }
            }

            this.persistentData.activities.push(data);
            this.saveData();
            console.log("alerting of incoming attack");

            this.plebbeAlerter.sendAlert(this.user, data.type + " kommer i " + (this.getVillageById(data.village).name || "???") + " från " + data.from + " kl " + new Date(data.time*1000).toString(), Date.now()/1000);

            return true;
        };

        this.findAttacks = function(village){
            console.log("we need to look into this attack on ", village.name);
            this.queueAction({
                "type": "ATTACK_CHECK",
                "village" : village.id,
                "time": this.getRandomTime(10*1000, 2*1000)
            });
        };

        this.clearOldActivities = function(){
            for(var a = this.persistentData.activities.length-1; a >= 0; a--){
                 var activity = this.persistentData.activities[a];
                if(activity.time*1000 < Date.now()){
                    this.persistentData.activities.splice(a, 1);
                    console.log("removing old activity", activity);
                }
            }
        };

        this.clearAttacks = function(village){
            for(var a = this.persistentData.activities.length-1; a >= 0; a--){
                 var activity = this.persistentData.activities[a];
                if(activity.village == village.name && (activity.type == "ATTACK" || activity.type == "RAID")){
                    this.persistentData.activities.splice(a, 1);
                }
            }
        };

        this.controlForAttacks = function(){
            for(var v in this.persistentData.villages){
                var village = this.persistentData.villages[v];
                if(village.attack){
                    console.log("look up attacks on ", village);
                    var attackInfo = this.getAttackByVillage(village);
                    if(attackInfo === null && this.persistentData.sitter.mode != "IDLE"){
                        this.findAttacks(village);
                    }
                }else{
                    this.clearAttacks(village);
                }
            }
        };

        this.scanForAttacks = function(triggerAction){
            console.log("WHERE DEM ATTACKS AT YO");

            var attackDetails = this.domAdapter.getAttackDetails();

            console.log(attackDetails);

            if(attackDetails !== null){

                console.log("WHERE IS MY SPAGHET");

                for(var ad = 0; ad < attackDetails.length; ad++){
                    var attack = attackDetails[ad];
                    attack.village = triggerAction.village;
                    var successfulWarning = this.addAttackData(attack);
                }

            }else{

                var movements = this.domAdapter.getMovementList();
                if(movements === null){
                    this.queueActionFirst({
                        "type": "VILLAGE_FIELDS",
                        "village" : triggerAction.village,
                        "time": 0
                    });
                    this.setNextActionTimer();
                    return;
                }

                console.log("movements", movements);

                for(var m in movements){
                    var movement = movements[m];
                    if(movement.type == "ATTACK" || movement.type == "ATTACK_SELF" || movement.type == "ATTACK_OUT"){
                        this.domAdapter.goToUrl(movement.url);
                    }
                }

            }

            hb.domAdapter.goToUrl(window.location.href);
        };

        this.getNextAction = function(){
            if(this.persistentData.actionQueue.length < 1)
                return null;

            return this.persistentData.actionQueue[0];
        };

        this.removeFirstAction = function(){
            if(this.persistentData.actionQueue.length < 1)
                return;

            this.persistentData.actionQueue.shift();
            this.saveData();
        };

        this.buildTroops = function(triggerAction){
            console.log("gotta buiild them troops according to this", triggerAction);

            if(window.location.href !== triggerAction.troopData.url){
                triggerAction.time += 2000;
                this.queueAction(triggerAction);
                this.domAdapter.goToUrl(triggerAction.troopData.url);
                return;
            }

            console.log("is building time boi");

            var numTroops = this.domAdapter.buildTroopsAttempt(triggerAction.troopData);

            this.persistentData.sitter.buildTroops[0].estimate = null;
            this.persistentData.sitter.buildTroops[0].lastbuild = Date.now();
            this.saveData();

            if(numTroops > 1){
                console.log("building", numTroops);
                this.plebbeAlerter.sendAlert(this.user, "Bygger " + numTroops + " " + triggerAction.troopData.name + " i " + this.getVillageById(triggerAction.troopData.village).name, Date.now()/1000);
                setTimeout(this.domAdapter.buildTroopsCommit, 2000);
            }else{
                console.log("aw man cant build anytihng....");
                this.domAdapter.goToFields();
            }

        };

        this.executeAction = function(){
            var action = hb.getNextAction();
            hb.removeFirstAction();

            console.log("executing action", action);

            switch(action.type){
                case "CHANGE_VILLAGE":
                    hb.domAdapter.changeVillage(hb.getVillageById(action.village).name);
                    break;

                case "VILLAGE_FIELDS":
                    hb.domAdapter.goToFields();
                    break;

                case "ATTACK_CHECK":
                    hb.scanForAttacks(action);
                    break;

                case "BUILD_TROOPS":
                    hb.buildTroops(action);
                    break;

                case "SEND_TROOPS":
                    hb.domAdapter.sendTroops(action);
                    break;

                case "CUSTOM_URL":
                    hb.domAdapter.goToUrl(action.url);
                    break;

                case "REFRESH":
                    hb.domAdapter.goToUrl(window.location.href);
                    break;
            }
        };

        this.setNextActionTimer = function(){
            if(this.nextUpdate != null)
                return;

            var nextAction = this.getNextAction();
            if(nextAction === null){
                this.setStatus("chillar");
                return;
            }

            if(this.activeVillage == null){
                this.setStatus("<b>INTE INLOGGAD??? Spara inlogg i Chrome för att harry boy ska logga in igen automatiskt!!</b>");
                // refresh page... might have timed out or server error or something
                setTimeout(function(){
                    location.reload();
                },15*1000*60);
                return;
            }

            if(nextAction.village != this.activeVillage.id && nextAction.type != "CHANGE_VILLAGE" && nextAction.village !== null){

                nextAction = {
                "type": "CHANGE_VILLAGE",
                "village" : nextAction.village,
                "time": this.getRandomTimeBeforeTime(3*1000, 2*100, nextAction.time)
                };

                this.queueAction(nextAction);
            }

            var targetTime = nextAction.time;
            if(targetTime < Date.now())
                targetTime = this.getRandomTime(1*1000, 100);

            // passive refreshes will be delayed so they dont disturb manual navigation
            if(this.persistentData.sitter.mode == "PASSIVE" && nextAction.type == "REFRESH" && targetTime > Date.now() - 100*1000){
                this.removeFirstAction();
                this.generateNextMove();
                nextAction = this.getNextAction();
                targetTime = nextAction.time;
            }

            var timeoutMillis = targetTime-Date.now();

            console.log("executing action in ", timeoutMillis, nextAction);
            clearInterval(this.counterInterval);
            this.counterInterval = setInterval(function(){
                hb.updateActionCountdown(nextAction.type, targetTime);
            }, 1000);

            var ds = this.domAdapter;
            this.nextUpdate = setTimeout(this.executeAction, timeoutMillis);

        };

        this.updateActionCountdown = function(actionType, targetTime){
            hb.setStatus(actionType + " om " + Math.round( (targetTime-Date.now()) /1000) + " sek");

            //something went wrong clearly... just go to something we know
            if((targetTime-Date.now())/1000 < -100){
                this.domAdapter.goToFields();
            }
        };

        this.generateNextMove = function(){
            console.log("sitter mode", this.persistentData.sitter.mode);

            var hasScheduledAction = false;

            if(this.persistentData.sitter.mode == "IDLE"){
                this.setStatus("chillar");
                return;
            }

            var nextAction = this.getNextAction();
            if(nextAction != null){
                hasScheduledAction = true;
                console.log("time until next action", (nextAction.time - Date.now()));
                if(nextAction.time - Date.now() > this.persistentData.options.pacetime*60*3*1000){
                    hasScheduledAction = false;
                }
                if(nextAction.type == "PREPARE_TROOPS" || nextAction.type == "SEND_TROOPS" && hasScheduledAction){
                    console.log("lets not disturb next action here now boi", new Date(nextAction.time*1000).toString());
                    return;
                }
            }

            if(this.persistentData.sitter.mode == "ACTIVE"){

                if(this.persistentData.sitter.buildTroops.length > 0){

                    this.persistentData.sitter.buildTroops.sort(function(a,b) {return (a.lastbuild > b.lastbuild) ? 1 : ((b.lastbuild > a.lastbuild) ? -1 : 0);} );
                    var troops = this.persistentData.sitter.buildTroops[0];

                    console.log("last buildtroops was at ", new Date(this.persistentData.sitter.buildTroops[this.persistentData.sitter.buildTroops.length-1].lastbuild).toString());

                    if(this.persistentData.sitter.buildTroops[this.persistentData.sitter.buildTroops.length-1].lastbuild + 1000*60*this.persistentData.options.trooptime < Date.now() ){
                        console.log("this troop has been waiting longest", troops);
                        var nextAction = {
                            "type": "BUILD_TROOPS",
                            "village" : troops.village,
                            "time": this.getRandomTime(40*1000, 5*1000),
                            "troopData": troops
                        };
                        this.queueAction(nextAction);
                        hasScheduledAction = true;
                    }else{
                        this.persistentData.sitter.buildTroops[0].estimate = this.persistentData.sitter.buildTroops[this.persistentData.sitter.buildTroops.length-1].lastbuild + 1000*60*this.persistentData.options.trooptime;
                        console.log("troops were built within last ",this.persistentData.options.trooptime," minutes");
                    }

                }

                if(!hasScheduledAction){
                    var rand = Math.floor(Math.random() * Math.floor(this.persistentData.villages.length-1));
                    var randomVillage = this.persistentData.villages[rand];
                    var nextAction = {
                        "type": "CHANGE_VILLAGE",
                        "village" : randomVillage.id,
                        "time": this.getRandomTime(this.persistentData.options.pacetime*60*1000, this.persistentData.options.pacetime*6*1000)
                    };
                    this.queueAction(nextAction);
                }

            }else if(this.persistentData.sitter.mode == "PASSIVE"){

                if(!hasScheduledAction){
                    var nextAction = {
                        "type": "REFRESH",
                        "village" : null,
                        "time": this.getRandomTime(this.persistentData.options.pacetime*60*1000, this.persistentData.options.pacetime*6*1000)
                    };
                    this.queueAction(nextAction);
                }

            }

/*
            if(this.nextUpdate === null){
                this.setNextActionTimer();
            }
  */
  };

        this.toggleSitter = function(mode){
            var sitter = this.persistentData.sitter;

            clearInterval(this.counterInterval);
            clearTimeout(this.nextUpdate);
            this.counterInterval = null;
            this.nextUpdate = null;

            if(sitter.mode == "IDLE" || sitter.mode != mode){
                sitter.mode = mode;
            }else{
                sitter.mode = "IDLE";
            }
            this.generateNextMove();

            if(sitter.mode !== "ACTIVE"){
                for(var i = this.persistentData.sitter.buildTroops.length-1; i >= 0; i--){
                    this.persistentData.sitter.buildTroops[i].estimate = null;
                }
            }

            this.setNextActionTimer();
            this.domAdapter.redrawInfoWindow();
            this.saveData();

        };

        this.toggleSitterTroops = function(troopType, troopName, villageId){
            console.log("toggle troop type ", troopType);

            for(var i = this.persistentData.sitter.buildTroops.length-1; i >= 0; i--){
                if(this.persistentData.sitter.buildTroops[i].type == troopType && this.persistentData.sitter.buildTroops[i].village == villageId){
                    this.persistentData.sitter.buildTroops.splice(i,1);
                    this.saveData();
                    this.domAdapter.redrawInfoWindow();
                    console.log("removed troop type", troopType, "from sitter queu");
                    return;
                }
            }

            this.persistentData.sitter.buildTroops.push({
                "type": troopType,
                "name": troopName,
                "village": villageId,
                "url": window.location.href,
                "lastbuild": 0
            });
            this.saveData();
            this.domAdapter.redrawInfoWindow();

        };

        this.checkStocks = function(){
            var fullStocks = this.domAdapter.getFullStocks();

            if(fullStocks.length === 0)
                return;

            var msg = "Fulla lager i "+this.activeVillage.name+"!!";
            for(var i = 0; i < fullStocks.length; i++){
                msg += " " + fullStocks[i].amount + " " + fullStocks[i].name;
            }

            this.plebbeAlerter.sendAlert(this.user, msg, Date.now()/1000);

        };

        this.scheduleAttack = function(time, strikeTime, targetName, attackData){

            console.log("gotta scheudule", time, attackData);

            console.log("time to prepare troops boi!!");

            var nextAction = {
                "type": "SEND_TROOPS",
                "village" : this.activeVillage.id,
                "strikeTime": strikeTime,
                "targetName": targetName,
                "attackData": attackData,
                "url": window.location.href,
                "stage" : "START",
                "time": this.getRandomTimeBeforeTime(15*1000, 1000, (time-1)*1000),
                "sendTime": time
            };
            this.queueAction(nextAction);

            this.saveData();
            this.domAdapter.redrawInfoWindow();

        };

        this.dropAction = function(index){
            console.log("remove activity index ", index);
            this.persistentData.actionQueue.splice(index, 1);
            this.saveData();
            this.domAdapter.redrawInfoWindow();

            if(index == 0){
                clearInterval(this.counterInterval);
                clearTimeout(this.nextUpdate);
                this.generateNextMove();
                this.setNextActionTimer();
            }
        };

        this.upgrade = function(){
            if (!this.persistentData.version) {
                // 0 --> 1
                // Clear villages so that they'll be re-added with a coords object
                this.persistentData.villages = [];
                this.persistentData.version = 1;
                this.saveData();
            }

            if (this.persistentData.version < 2) {
                // 1 --> 2
                // Clear villages again, now identified by their id
                this.persistentData.villages = [];
                this.persistentData.version = 2;
                this.saveData();
            }

            if (this.persistentData.version < 3) {
                // 2 --> 3
                // Add user login settings
                this.persistentData.options.savedUsername = null;
                this.persistentData.options.savedPassword = null;
                this.persistentData.version = 3;
                this.saveData();
            }

            if (this.persistentData.version < 4) {
                // 3 --> 4
                // Reset troop builder data, add village id
                this.persistentData.sitter.buildTroops = [];
                this.persistentData.version = 4;
                this.saveData();
            }
        };

        this.updateOption = function(option, value){
            console.log("setting option", option, "to", value);
            this.persistentData.options[option] = value;
            this.saveData();
        };

        this.init = function(){
            if (window.location.href.includes("manual.php"))
                return;

            console.log("Harry boy aktiverad");

            /*
            GM_setValue('harryBoyP', {
                "villages": [],
                "activities" : [],
                "actionQueue": [],
                "sitter": {
                    "mode": "IDLE",
                    "buildTroops": []
                },
                "alerts": [],
                "options": {
                    "trooptime": 30,
                    "pacetime": 2
                }
            });
*/

            this.persistentData = GM_getValue('harryBoyP', {
                "villages": [],
                "activities" : [],
                "actionQueue": [],
                "sitter": {
                    "mode": "IDLE",
                    "buildTroops": []
                },
                "alerts": [],
                "options": {
                    "trooptime": 40,
                    "pacetime": 4,
                    "savedUsername": null,
                    "savedPassword": null
                },
                "version": 4
            });
            this.upgrade();
            this.user = this.domAdapter.getUser();
            console.log("loaded data", this.persistentData);

            this.persistentData.activities.sort(function(a,b) {return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);} );

            this.domAdapter.attemptLogin(this.persistentData.options.savedUsername, this.persistentData.options.savedPassword);
            this.domAdapter.addInfoWindow();
            this.clearOldActivities();
            this.updateVillages();
            console.log("aktiv by e ", this.activeVillage);

            this.updateProductionNumbers();
            this.controlForAttacks();
            this.checkStocks();
            this.generateNextMove();
            this.setNextActionTimer();
            this.domAdapter.addCountdownAlarmButtons();
            this.domAdapter.addTroopSitterButtons();
            this.domAdapter.addAttackScheduler();
            this.domAdapter.addVillageSelector(this.persistentData.villages);
            this.domAdapter.formatStats();
            this.domAdapter.addFoxSettings();
            this.domAdapter.addTradeRouteMenu();
        };

    }

    var hb = new HarryBoy();
    hb.init();


})();