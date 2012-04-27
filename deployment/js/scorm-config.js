var learnername = ""; // Nome do aluno
var completed = false; // Status da AI: completada ou não
var score = 0; // Nota do aluno (de 0 a 100)
var scormExercise = 1; // Exercício corrente relevante ao SCORM
var screenExercise = 1; // Exercício atualmente visto pelo aluno (não tem relação com scormExercise)
var N_EXERCISES = 2; // Quantidade de exercícios desta AI
var scorm = pipwerks.SCORM; // Seção SCORM
scorm.version = "2004"; // Versão da API SCORM
var PING_INTERVAL = 5 * 60 * 1000; // milissegundos
var pingCount = 0; // Conta a quantidade de pings enviados para o LMS

// Inicia a AI.
$(document).ready(function(){
 
  //Deixa a aba "Orientações" ativa no carregamento da atividade
  $('#exercicios').tabs({ selected: 2 }); 
 
  $('#exercicios').tabs({
      select: function(event, ui) {
        screenExercise = ui.index + 1;
      }
  });
                                       
  $('#button1').button().click(evaluateExercise);
  $('#button2').button().click(evaluateExercise);
  
  initAI();
});

// Encerra a AI.
$(window).unload(function (){
  if (!completed) {
    save2LMS();
    scorm.quit();
  }
});

/*
 * Inicia a AI.
 */ 
function initAI () {
 
  // Conecta-se ao LMS
  var connected = scorm.init();
  
  // A tentativa de conexão com o LMS foi bem sucedida.
  if (connected) {
  
    // Verifica se a AI já foi concluída.
    var completionstatus = scorm.get("cmi.completion_status");
    
    // A AI já foi concluída.
    switch (completionstatus) {
    
      // Primeiro acesso à AI
      case "not attempted":
      case "unknown":
      default:
        completed = false;
        learnername = scorm.get("cmi.learner_name");
        scormExercise = 1;
        score = 0;
        
        $("#completion-message").removeClass().addClass("completion-message-off");    
        break;
        
      // Continuando a AI...
      case "incomplete":
        completed = false;
        learnername = scorm.get("cmi.learner_name");
        scormExercise = parseInt(scorm.get("cmi.location"));
        score = parseInt(scorm.get("cmi.score.raw"));
        
        $("#completion-message").removeClass().addClass("completion-message-off");
        break;
        
      // A AI já foi completada.
      case "completed":
        completed = true;
        learnername = scorm.get("cmi.learner_name");
        scormExercise = parseInt(scorm.get("cmi.location"));
        score = parseInt(scorm.get("cmi.score.raw"));
        
        $("#completion-message").removeClass().addClass("completion-message-on");
        break;
    }
    
    if (isNaN(scormExercise)) scormExercise = 1;
    if (isNaN(score)) score = 0;
    
    // Posiciona o aluno no exercício da vez
    screenExercise = scormExercise;
    $('#exercicios').tabs("select", scormExercise - 1);  
    
    pingLMS();
    
  }
  // A tentativa de conexão com o LMS falhou.
  else {
    completed = false;
    learnername = "";
    scormExercise = 1;
    score = 0;
    log.error("A conexão com o Moodle falhou.");
  }
  
  // (Re)abilita os exercícios já feitos e desabilita aqueles ainda por fazer.
  if (completed) $('#exercicios').tabs("option", "disabled", []);
  else {
    for (i = 0; i < N_EXERCISES; i++) {
      if (i < scormExercise) $('#exercicios').tabs("enable", i);
      else $('#exercicios').tabs("disable", i);
    }
  }
}

/*
 * Salva cmi.score.raw, cmi.location e cmi.completion_status no LMS
 */ 
function save2LMS () {
  if (scorm.connection.isActive) {
  
    // Salva no LMS a nota do aluno.
    var success = scorm.set("cmi.score.raw", score);
  
    // Notifica o LMS que esta atividade foi concluída.
    success = scorm.set("cmi.completion_status", (completed ? "completed" : "incomplete"));
    
    // Salva no LMS o exercício que deve ser exibido quando a AI for acessada novamente.
    success = scorm.set("cmi.location", scormExercise);
    
    if (!success) log.error("Falha ao enviar dados para o LMS.");
  }
  else {
    log.trace("A conexão com o LMS não está ativa.");
  }
}

/*
 * Mantém a conexão com LMS ativa, atualizando a variável cmi.session_time
 */
function pingLMS () {

	scorm.get("cmi.completion_status");
	var timer = setTimeout("pingLMS()", PING_INTERVAL);
}

/*
 * Avalia a resposta do aluno ao exercício atual. Esta função é executada sempre que ele pressiona "terminei".
 */ 
function evaluateExercise (event) {

  // Avalia a nota
  var currentScore = getScore(screenExercise);

  // Mostra a mensagem de erro/acerto
  feedback(screenExercise, currentScore);

  // Atualiza a nota do LMS (apenas se a questão respondida é aquela esperada pelo LMS)
  if (!completed && screenExercise == scormExercise) {
    score = Math.max(0, Math.min(score + currentScore, 100));
    
    if (scormExercise < N_EXERCISES) {
      nextExercise();
    }
    else {
      completed = true;
      scormExercise = 1;
      save2LMS();
      scorm.quit();
    }
  }
}

/*
 * Prepara o próximo exercício.
 */ 
function nextExercise () {
  if (scormExercise < N_EXERCISES) ++scormExercise;
  
  $('#exercicios').tabs("enable", (scormExercise - 1));
}

/*
 * Avalia a nota do aluno num dado exercício.
 */ 
function getScore (exercise) {

  ans = 0;

  switch (exercise) {
  
    // Avalia a nota do exercício 1
    case 1:
    default:
      var r_x = document.ggbApplet.getXcoord('R2') - document.ggbApplet.getXcoord('R1');
      var r_y = document.ggbApplet.getYcoord('R2') - document.ggbApplet.getYcoord('R1');

      var v_x = document.ggbApplet.getXcoord('V2') - document.ggbApplet.getXcoord('V1');
      var v_y = document.ggbApplet.getYcoord('V2') - document.ggbApplet.getYcoord('V1');

      var a_x = document.ggbApplet.getXcoord('A2') - document.ggbApplet.getXcoord('A1');
      var a_y = document.ggbApplet.getYcoord('A2') - document.ggbApplet.getYcoord('A1');

      var rho_x = document.ggbApplet.getXcoord('B') - document.ggbApplet.getXcoord('A');
      var rho_y = document.ggbApplet.getYcoord('B') - document.ggbApplet.getYcoord('A');

      var phi_x = document.ggbApplet.getXcoord('D') - document.ggbApplet.getXcoord('C');
      var phi_y = document.ggbApplet.getYcoord('D') - document.ggbApplet.getYcoord('C');

      var i_x = document.ggbApplet.getXcoord('IREF2') - document.ggbApplet.getXcoord('IREF1');
      var i_y = document.ggbApplet.getYcoord('IREF2') - document.ggbApplet.getYcoord('IREF1');

      var j_x = document.ggbApplet.getXcoord('JREF2') - document.ggbApplet.getXcoord('JREF1');
      var j_y = document.ggbApplet.getYcoord('JREF2') - document.ggbApplet.getYcoord('JREF1');


      if (r_x == 0 && r_y == 2 &&
          rho_x == 0 && rho_y/Math.abs(rho_y) == 1 &&
          v_x/Math.abs(v_x) == -1 && v_y == 0 &&
          phi_x/Math.abs(phi_x) == -1 && phi_y == 0 &&
          i_x/Math.abs(i_x) == 1 && i_y == 0 &&
          j_x == 0 && j_y/Math.abs(j_y) == 1 &&
          a_x == 0 && a_y == -8
          ) {
          ans = 50;
      } else {
          ans = 0;
      }
      
      break;
      
    // Avalia a nota do exercício 2
    case 2:
    
      var a_cp = $('#a_rho').val();
      
      if (a_cp == 8) {
          ans = 50;
      } else {
          ans = 0;
      }    
    
      break;
  }
  
  return ans;
}

/*
 * Exibe a mensagem de erro/acerto (feedback) do aluno para um dado exercício e nota (naquele exercício).
 */ 
function feedback (exercise, score) {
                     
  switch (exercise) {
  
    // Feedback da resposta ao exercício 1
    case 1:
    default:
      if (score == 50) {
          $('#message1').html('<p/>Resposta correta!').removeClass().addClass("right-answer");
      } else {
          $('#message1').html('<p/>Resposta incorreta.').removeClass().addClass("wrong-answer");
      }
      
      break;
    
    // Feedback da resposta ao exercício 2
    case 2:
      if (score == 50) {
          $('#message2').html('<p/>Resposta correta!').removeClass().addClass("right-answer");
      } else {
          $('#message2').html('<p/>Resposta incorreta.').removeClass().addClass("wrong-answer");
      }
      
      break;
  }
}


var log = {};

log.trace = function (message) {
  /*
	if(window.console && window.console.firebug){
    console.log(message);
  }
  else {
    alert(message);
  }
  */
}

log.error = function (message) {
  /*
	if( (window.console && window.console.firebug) || console){
    console.error(message);
  }
  else {
    alert(message);
  }
  */
}

