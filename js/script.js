var calculatePlan = (time, cancel, factor, plan) => {
	if(!factor)return Math.round(plan * ((cancel-time)/1000/60/60/24/7*5));
	else return Math.round(factor * plan);
}

var checkAccess = () => {
	BX24.callMethod('user.admin', {}, function(res) {
		if (res.data()) {
			BX24.callMethod("entity.get", {}, function(ent) {
				var perm = false;
				for (let i = 0; i < ent.data().length; i++) {
					if (ent.data()[i]['ENTITY'] == "Entity") perm = true;
				}
				if (perm === false) {
					createEntity();
				}
			});
			var set = document.getElementById('setting');
			var prnt = document.getElementById('prnt');
			var selectUser = document.getElementById('selectUser')
			set.style.display = 'inline-block';
			prnt.style.display = 'inline-block';
			selectUser.style.display = 'inline-block';
		}
	});
}

var createEntity = () => {
	BX24.callMethod('entity.add', {'ENTITY': 'Entity', 'NAME': 'EntityName', 'ACCESS': {U1:'X',AU:'X', CR:'X', G1:'X', D1:'X'}}, function(res){
		if(res.error()) console.error(res.error());
		else{
			BX24.callMethod('user.get', {}, function(users){
				if(users.error()) console.error(users.error());
				else{
					for(let i = 0; i < users.data().length; i++){
						var prop = "id_"+users.data()[i]['ID'];
						BX24.callMethod('entity.item.property.add', {ENTITY: 'Entity', PROPERTY: prop, NAME: "0", TYPE: 'N'}, function(res1){
							if(res1.error())	console.error(res1.error());
						});
					}
				}
			});
			console.log("Хранилище создано");
		}
	});
}

var getCalls = (time, cancel, ID, cell) => {
	var start = new Date(time);
	var canc = new Date(cancel);
	if (document.getElementById('typeOfCall').value == "Исходящие"){
		BX24.callMethod('voximplant.statistic.get', {filter: {">CALL_START_DATE": start, "<CALL_START_DATE": canc, ">CALL_DURATION": 0, "PORTAL_USER_ID": ID, "CALL_TYPE": 1}}, function(calls){
			console.log("srv");
			if (calls.error()) {
				console.error(calls.error());
				if(calls.error()['ex']['error'] == "ACCESS_DENIED" || calls.error()['status'] == 403) {
					alert("У вас нет доступа к данным, которые необходимы для построения отчёта, обратитесь к администратору портала!");
					return;
				}
			}
			else cell.innerHTML = calls.total();							
		})
	}

	else if (document.getElementById('typeOfCall').value == "Входящие") {
		BX24.callMethod('voximplant.statistic.get', {filter: {">CALL_START_DATE": start, "<CALL_START_DATE": canc, ">CALL_DURATION": 0, "PORTAL_USER_ID": ID, "CALL_TYPE": 2}}, function(calls){
			console.log("srv");
			if (calls.error()) {
				console.error(calls.error());
				if(calls.error()['ex']['error'] == "ACCESS_DENIED" || calls.error()['status'] == 403) {
					alert("У вас нет доступа к данным, которые необходимы для построения отчёта, обратитесь к администратору портала!");
					return;
				}
			}
			else cell.innerHTML = calls.total();							
		})
	}

	else if (document.getElementById('typeOfCall').value == "Все") {
		BX24.callMethod('voximplant.statistic.get', {filter: {">CALL_START_DATE": start, "<CALL_START_DATE": canc, ">CALL_DURATION": 0, "PORTAL_USER_ID": ID}}, function(calls){
			console.log("srv");
			if (calls.error()) {
				console.error(calls.error());
				if(calls.error()['ex']['error'] == "ACCESS_DENIED" || calls.error()['status'] == 403) {
					alert("У вас нет доступа к данным, которые необходимы для построения отчёта, обратитесь к администратору портала!");
					return;
				}
			}
			else cell.innerHTML = calls.total();							
		})
	}
}

var getDefaultUsersList = () => {
	BX24.callMethod('user.get', {filter: {"ACTIVE": true}}, function(users){
		for (let i = 0; i < users.data().length; i++) defaultUsersList.push(users.data()[i]);
	})
}

var selectUsersToList = () => {
	defaultUsersList = [];
	selectUsersList = "";
	BX24.selectUsers(function(usr){
		BX24.callMethod('user.get', {}, function(res){
			for (let i = 0; i < res.data().length; i++) {
				for (let j = 0; j < usr.length; j++) {
					if (res.data()[i]['ID'] == usr[j]['id']) {
						defaultUsersList.push(res.data()[i]);
						addList(usr[j]['id']);
					}
				}
			}
		})
		getTable(dayStart, dayFinish, 1);
	});
}

var addList = (param) => {
	selectUsersList = selectUsersList + param + ", ";
	localStorage.selectUsersList = selectUsersList;
}

var getTable = (time, cancel, factor, code) => {
	if(time>cancel) {
		alert("Начальная дата не может быть больше конечной!");
		return;
	}
	var text = '';
	var from = document.getElementById('d').value;
	var to = document.getElementById('d1').value;
	if (factor == 1) text = 'на текущий день';
	else if (factor == 5) text = 'на текущую неделю';
	else if (factor == 21) text = 'на текущий месяц';
	else text = 'на период с '+from+' по '+to;
	
	BX24.callMethod('user.admin', {}, function(res){
		if(res.data()){
			BX24.callMethod('entity.item.property.get', {ENTITY: 'Entity'}, function(mas){
				if(mas.error()) {
					if(mas.error()['status'] == 400) createEntity();
					console.error(mas.error());
				}
				else{
					var bx = mas.data();
					var el=document.getElementById('tb');

					if(el){
						var find = document.getElementById('tb');
						find.parentNode.removeChild(find);
					}
					let localUsers = localStorage.selectUsersList.split(", ");
					var newTable=document.createElement('table');
					newTable.id = 'tb';
					$("div.tHead").text("План по звонкам для пользователей "+text+":");
					document.body.appendChild(newTable);
					var newRow=newTable.insertRow(0);
					var newCell = newRow.insertCell(0);
					newCell.width="7%";
					newCell.innerHTML="ID";
					newCell.style = "display: none";
					var newCell = newRow.insertCell(1);
					newCell.width="16%";
					newCell.innerHTML="Номер";
					var newCell = newRow.insertCell(2);
					newCell.width="47%";
					newCell.innerHTML="Имя";
					
					var newCell = newRow.insertCell(3);
					newCell.width="15%";
					newCell.innerHTML="План";
					var newCell = newRow.insertCell(4);
					newCell.width="15%";
					newCell.innerHTML="Звонки";
					if(res.error()) console.error(res.error());
					else{
						for (let i = 0; i < localUsers.length; i++) {
							for (let j = 0; j < bx.length; j++) {
								if(localUsers[i] == bx[j]['PROPERTY'].split('_')[1]){
									var plan = bx[j]['NAME'];
								}
							}
							for(let k = 0; k < defaultUsersList.length; k++){
								if(defaultUsersList[k]["ID"] == localUsers[i])
								{
									var newRow=newTable.insertRow(i+1);
									var newCell = newRow.insertCell(0);
									newCell.width="7%";
									newCell.innerHTML=defaultUsersList[k]['ID'];
									newCell.style = "display: none";

									var newCell = newRow.insertCell(1);
									newCell.width="16%";
									newCell.innerHTML=defaultUsersList[k]['UF_PHONE_INNER'];

									var newCell = newRow.insertCell(2);
									newCell.width="47%";
									newCell.innerHTML=defaultUsersList[k]['LAST_NAME'] + " " + defaultUsersList[k]['NAME'];		

									var newCell = newRow.insertCell(3);
									if(code == "edit") {
										newCell.className = "edit";
										newCell.contentEditable = true;
									}
									newCell.width="15%";
									newCell.innerHTML=calculatePlan(time, cancel, factor, plan);

									var newCell = newRow.insertCell(4);
									newCell.width="15%";
									getCalls(time, cancel, defaultUsersList[k]['ID'], newCell);
								}
							}
						}
					}
				}
				BX24.fitWindow();
			})	
		}
		if(!res.data()){
			BX24.callMethod('user.current', {}, function(res){
				if(res.error()){
					console.error(res.error());
				}
				BX24.callMethod('entity.item.property.get', {ENTITY: 'Entity', PROPERTY: "id_"+res.data()['ID']}, function(mas){
					if(mas.error()){
						alert("Отсутствуют данные о планах!");
						console.error(mas.error());
						return;
					}
					else{
						var plan = mas.data()['NAME'];
						var el=document.getElementById('tb');
						if(el){
							var find = document.getElementById('tb');
							find.parentNode.removeChild(find);
						}
						var newTable=document.createElement('table');
						newTable.id = 'tb';
						newTable.style = "margin-top: 20px";
						document.body.appendChild(newTable);
						var newRow=newTable.insertRow(0);
						newRow.style = "border:none; text-align: center;";
						var newCell = newRow.insertCell(0);
						newCell.width="auto";
						newCell.style = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; font-weight: 300; font-size: 28px";
						newCell.innerHTML=res.data()['NAME']+", план звонков для вас " + text;	

						var newRow=newTable.insertRow(1);
						newRow.style = "border:none; text-align: center;";
						var newCell = newRow.insertCell(0);
						newCell.width="auto";
						newCell.style = "color: black; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; font-weight: 300; font-size: 42px";
						newCell.innerHTML = calculatePlan(time, cancel, factor, plan);
					}
				})
			});
		}
	})
}

var setPlan = (id, value) => {
	BX24.callMethod("entity.get",{},function(ent){
		var flag = false;
		for (let i = 0; i < ent.data().length; i++) {
			if(ent.data()[i]['ENTITY'] == "Entity") flag = true;
		}
		if(flag === false){
			createEntity();
			setPlanForUser(id, value);
		}
		else setPlanForUser(id, value);
	});
}

var setPlanForUser = (id, value) => {
		BX24.callMethod('entity.item.property.get', {ENTITY: 'Entity', PROPERTY: 'id_'+id}, function(r){
			if(r.error()){
				BX24.callMethod('entity.item.property.add', {ENTITY: 'Entity', PROPERTY: 'id_'+id, NAME: value, TYPE: 'N'}, function(res){
					if(res.error()) console.error(res.error());
				});
			}
			else{
				BX24.callMethod('entity.item.property.update', {ENTITY: 'Entity', PROPERTY: 'id_'+id, NAME: value}, function(re){
					if(re.error()) console.error(re.error());
					else console.log("Пользователю "+id+" установлен план по звонкам в количестве "+ value);
				});
			}
		});
}

var setCurrentDate = () => {
	let year = String(today.getFullYear());
	let month = String(today.getMonth() + 1);
	if(month.length == 1) month = "0" + month;
	let date = String(today.getDate());
	if(date.length == 1) date = "0" + date;
	let currentDate = year + '-' + month + '-' + date;
	$("#d1").val(currentDate);
}

var setMonthStart = () => {
	let year = String(today.getFullYear());
	let month = String(today.getMonth() + 1);
	if(month.length == 1) month = "0" + month;
	let date = "01";
	let monthStart = year + '-' + month + '-' + date;
	$("#d").val(monthStart);
}

var editMode = () => {
	getTable(dayStart, dayFinish, 1, "edit");
}

/*
var del = () => {
	//BX24.callMethod('entity.item.property.delete', {ENTITY: 'Entity', PROPERTY: 'id_639'});
	BX24.callMethod('entity.delete', {'ENTITY': 'Entity'}, function(res){
		if (res.error()) console.error(res.error());
		else alert(res+" удалено");
	});
}*/


/*
var getEntityList = () => {
	BX24.callMethod("entity.get",{},function(result){
		if(result.error()) console.error(result.error());
		else console.info("Список созданных хранилищ:", result.data());
	});
	BX24.callMethod('entity.section.get', {'ENTITY': 'Entity'}, function(result){
		if(result.error()) console.error(result.error());
		else console.info("Список разделов хранилища:", result.data());
	});
	BX24.callMethod('entity.item.get', {ENTITY: 'Entity'}, function(result){
		if(result.error()) console.error(result.error());
		else console.info("Список элементов хранилища:", result.data());
	});
	BX24.callMethod('entity.item.property.get', {ENTITY: 'Entity'}, function(result){
		if(result.error()) console.error(result.error());
		else console.info("Список свойств элемента хранилища:", result.data());
	});
	
}
*/       