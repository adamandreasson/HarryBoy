// ==UserScript==
// @name         Harry Boy
// @namespace    https://adamandreasson.se/
// @version      1.0.7
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
            return parseInt(str.replace(/[^0-9.]/g, ""));
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

            console.log(date);
            console.log(date.getTime());

            return Math.round(date.getTime()/1000);
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

        this.goToFields = function(){
            window.location.href = "/dorf1.php";
        };

        this.goToUrl = function(url){
            window.location.href = url;
        };

        this.getUser = function(){
            return jQuery('.playerName').text().replace(/[\t\n\r]/gm,'').trim();
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
                console.log('found village ' + name);
            });
            return list;
        };

        this.getActiveVillageName = function(){
            return jQuery("div#sidebarBoxActiveVillage #villageNameField").text();
        };

        this.getActiveVillageId = function(){
            return jQuery("div#sidebarBoxVillagelist .content li.active a").attr("href").match(/newdid=(\d+)/)[1];
        };

        this.getProductionNumbers = function(){

            var resources = [];
            jQuery("#map_details table#production tbody tr").each(function(){
                resources.push(toNumbersOnly(jQuery(this).find(".num").text()));
            });
            return resources;

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
                hb.toggleSitterTroops(troops, troopName);
                event.preventDefault();
                return false;
            });
        };

        this.redrawInfoWindow = function(){
            var dom = '🦊 Harry Boy';
            dom += '<div class="hb-status" style="color:#ddd;font-size:0.9em;">'+hb.status+'</div>';

            for(var i = 0; i < hb.persistentData.activities.length; i++){
                var activity = hb.persistentData.activities[i];
                dom += '<div style="border:1px solid #cc0;padding:5px;">' + activity.type + ' i '+activity.village+' från ' + activity.from + ' kl ' + new Date(activity.time*1000).toString() + '</div>';
            }

            dom += '<div class="hb-options" style="background:#333;padding:5px;">Rävsitter i mode '+hb.persistentData.sitter.mode+'<br>';

            if(hb.persistentData.sitter.mode == "ACTIVE"){
                dom += '<div class="hb-building">';
            }else{
                dom += '<div class="hb-building" style="color: #888;">';
            }

            for(var i = 0; i < hb.persistentData.sitter.buildTroops.length; i++){
                var troopData = hb.persistentData.sitter.buildTroops[i];
                var est = "";
                if('estimate' in troopData && troopData.estimate !== null){
                    var estMinutes = (troopData.estimate - Date.now())/60/1000;
                    if(estMinutes < 0)
                        estMinutes = 0;
                    est = '(om ca '+estMinutes.toFixed(1) + " min)";
                }
                dom += (i+1) + '. Kommer bygga '+troopData.name+' i ' + troopData.village + ' <button class="hb-sitter-queue" hbTroop="'+troopData.type+'" hbTroopName="'+troopData.name+'" style="color:#e00; padding:2px; margin-right:10px;">x</button> '+est+'<br>';
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

                    var foxButton = '<button class="hb-sitter-queue" hbActive="nope" hbTroop="'+troopName+'" hbTroopName="'+troopFullName+'" style="border:1px solid #ccc; padding:2px; margin-right:10px;">🦊 Köa hos rävsitter</button>';

                    jQuery(this).find('.details').append(foxButton);
                });

            }

        };

        this.addVillageSelector = function(villages){
            if (jQuery(".coordinatesInput").length > 0 && jQuery(".merchantsAvailable").length > 0) {
                var dom = '<div class="clear"></div><select class="hb-village-sel" style="margin-top: 5px"><option>Välj en av dina byar</option>';
                for (var i = 0; i < villages.length; i++) {
                    dom += '<option x="' + villages[i].coords.x + '" y="' + villages[i].coords.y + '">' + villages[i].name + '</option>';
                }
                dom += '</select>';

                jQuery(dom).insertAfter(".coordinatesInput");

                const domAdapter = this;
                jQuery("body").on("change", ".hb-village-sel", function(event){
                    var village = jQuery(this).find(":selected");
                    var x = village.attr("x");
                    var y = village.attr("y");

                    if (x || y) {
                        domAdapter.simulateInput(document.getElementById("xCoordInput"), x);
                        domAdapter.simulateInput(document.getElementById("yCoordInput"), y);
                    }
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

        this.getAlertLog = function(){
            return this.persistentData.alerts;
        };

        this.addAlertLog = function(entry){
            this.persistentData.alerts.push(entry);
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
        }

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
                if(otherAction.type == action.type && otherAction.village == action.village)
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
                }

            }
            this.saveData();

            var activeVillageId = this.domAdapter.getActiveVillageId();
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
                if(activity.village == village.name && (activity.type == "ATTACK" || activity.type == "RAID")){
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

            this.plebbeAlerter.sendAlert(this.user, data.type + " kommer i " + data.village + " från " + data.from + " kl " + new Date(data.time*1000).toString(), Date.now()/1000);

            return true;
        };

        this.findAttacks = function(village){
            console.log("we need to look into this attack on ", village.name);
            this.queueAction({
                "type": "ATTACK_CHECK",
                "village" : village.name,
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
                    if(attackInfo === null){
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

            if(attackDetails !== null){

                console.log("WHERE IS MY SPAGHET");
                console.log(attackDetails);

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
                    if(movement.type == "ATTACK" || movement.type == "ATTACK_SELF"){
                        this.domAdapter.goToUrl(movement.url);
                    }
                }

            }

            this.setNextActionTimer();
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
                this.queueActionFirst({
                    "type": "CUSTOM_URL",
                    "village" : triggerAction.village,
                    "time": this.getRandomTime(5*1000, 1*1000),
                    "url": triggerAction.troopData.url
                });
                this.setNextActionTimer();
                return;
            }

            console.log("is building time boi");

            var numTroops = this.domAdapter.buildTroopsAttempt(triggerAction.troopData);

            this.persistentData.sitter.buildTroops[0].estimate = null;
            this.persistentData.sitter.buildTroops[0].lastbuild = Date.now();
            this.saveData();

            if(numTroops > 1){
                console.log("building", numTroops);
                this.plebbeAlerter.sendAlert(this.user, "Bygger " + numTroops + " " + triggerAction.troopData.name + " i " + triggerAction.troopData.village, Date.now()/1000);
                setTimeout(this.domAdapter.buildTroopsCommit, 2000);
            }else{
                this.domAdapter.goToFields();
            }

        };

        this.executeAction = function(){
            var action = hb.getNextAction();
            hb.removeFirstAction();

            console.log("executing action", action);

            switch(action.type){
                case "CHANGE_VILLAGE":
                    hb.domAdapter.changeVillage(action.village);
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

                case "CUSTOM_URL":
                    hb.domAdapter.goToUrl(action.url);
                    break;

                case "REFRESH":
                    hb.domAdapter.goToUrl(window.location.href);
                    break;
            }
        };

        this.setNextActionTimer = function(){
            var nextAction = this.getNextAction();
            if(nextAction === null){
                this.setStatus("chillar");
                return;
            }

            if(nextAction.village != this.activeVillage.name && nextAction.type != "CHANGE_VILLAGE" && nextAction.village !== null){

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

            if(this.persistentData.sitter.mode == "PASSIVE" && nextAction.type == "REFRESH" && targetTime > Date.now() - 100*1000)
                targetTime += 100*1000;

            var timeoutMillis = targetTime-Date.now();

            console.log("executing action in ", timeoutMillis, nextAction);
            this.counterInterval = setInterval(function(){
                hb.setStatus(nextAction.type + " om " + Math.round( (targetTime-Date.now()) /1000) + " sek");
            }, 1000);

            var ds = this.domAdapter;
            this.nextUpdate = setTimeout(this.executeAction, timeoutMillis);

        };

        this.generateNextMove = function(){
            console.log("sitter mode", this.persistentData.sitter.mode);
            if(this.persistentData.sitter.mode == "IDLE"){
                this.setStatus("chillar");
                return;
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
                    }else{
                        this.persistentData.sitter.buildTroops[0].estimate = this.persistentData.sitter.buildTroops[this.persistentData.sitter.buildTroops.length-1].lastbuild + 1000*60*this.persistentData.options.trooptime;
                        console.log("troops were built within last ",this.persistentData.options.trooptime," minutes");
                    }

                }

                if(this.getNextAction() === null){
                    var rand = Math.floor(Math.random() * Math.floor(this.persistentData.villages.length-1));
                    var randomVillage = this.persistentData.villages[rand];
                    var nextAction = {
                        "type": "CHANGE_VILLAGE",
                        "village" : randomVillage.name,
                        "time": this.getRandomTime(this.persistentData.options.pacetime*60*1000, this.persistentData.options.pacetime*6*1000)
                    };
                    this.queueAction(nextAction);
                }

            }else if(this.persistentData.sitter.mode == "PASSIVE"){

                var nextAction = {
                    "type": "REFRESH",
                    "village" : null,
                    "time": this.getRandomTime(this.persistentData.options.pacetime*60*1000, this.persistentData.options.pacetime*6*1000)
                };
                this.queueAction(nextAction);

            }

            if(this.nextUpdate === null){
                this.setNextActionTimer();
            }
        };

        this.toggleSitter = function(mode){
            var sitter = this.persistentData.sitter;

            clearInterval(this.counterInterval);
            clearTimeout(this.nextUpdate);
            this.counterInterval = null;
            this.nextUpdate = null;
            this.persistentData.actionQueue = [];

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

            this.domAdapter.redrawInfoWindow();
            this.saveData();

        };

        this.toggleSitterTroops = function(troopType, troopName){
            console.log("toggle troop type ", troopType);

            for(var i = this.persistentData.sitter.buildTroops.length-1; i >= 0; i--){
                if(this.persistentData.sitter.buildTroops[i].type == troopType){
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
                "village": this.activeVillage.name,
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
                    "pacetime": 4
                },
                "version": 2
            });
            this.upgrade();
            this.user = this.domAdapter.getUser();
            console.log("loaded data", this.persistentData);

            this.persistentData.activities.sort(function(a,b) {return (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0);} );

            this.domAdapter.addInfoWindow();
            this.clearOldActivities();
            this.updateVillages();
            console.log("aktiv by e ", this.activeVillage);

            this.updateProductionNumbers();
            this.controlForAttacks();
            this.checkStocks();
            this.setNextActionTimer();
            this.generateNextMove();
            this.domAdapter.addCountdownAlarmButtons();
            this.domAdapter.addTroopSitterButtons();
            this.domAdapter.addVillageSelector(this.persistentData.villages);
        };

    }

    var hb = new HarryBoy();
    hb.init();


})();