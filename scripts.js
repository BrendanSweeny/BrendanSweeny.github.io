$(document).ready(function() {
  $('#home').click(function() {
    loc = $('#header').offset().top
    $('html, body').animate({
      scrollTop: loc
    }, 500);
  })

  $('#about').click(function() {
    loc = $('#about-title').offset().top
    $('html, body').animate({
      scrollTop: loc - 50
    }, 500);
  })

  $('#research').click(function() {
    loc = $('#research-title').offset().top
    $('html, body').animate({
      scrollTop: loc - 50
    }, 500);
  })

  $('#publications').click(function() {
    loc = $('#pub-title').offset().top
    $('html, body').animate({
      scrollTop: loc - 50
    }, 500);
  })

  $('#contact').click(function() {
    loc = $('#contact-title').offset().top
    $('html, body').animate({
      scrollTop: loc - 50
    }, 500);
  })

  $('#web').click(function() {
    loc = $('#web-title').offset().top
    $('html, body').animate({
      scrollTop: loc - 50
    }, 500);
  })
/*
  $(".pull-down").each(function() {
    $(this).css("margin-top", $(this).parent().height() - $(this).height())
  })

  $("#synthesis").on("click", function(e) {
    e.preventDefault();
    $("#materials-description").slideToggle("fast");
  })

  $("#instrument").on("click", function(e) {
    e.preventDefault();
    $("#instrument-description").slideToggle("fast");
  })

  $("#catalyst").on("click", function(e) {
    e.preventDefault();
    $("#catalyst-description").slideToggle("fast");
  })

  $("#outreach").on("click", function(e) {
    e.preventDefault();
    $("#outreach-description").slideToggle("fast");
  })
  */
});
