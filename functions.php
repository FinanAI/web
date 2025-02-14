<?php
function finanai_enqueue_scripts() {
    // Cargar los archivos CSS del tema
    wp_enqueue_style('finanai-style', get_stylesheet_uri());

    // Cargar archivos JavaScript en el frontend
    wp_enqueue_script('finanai-app', get_template_directory_uri() . '/assets/js/app.js', array('jquery'), false, true);
    wp_enqueue_script('finanai-analysis', get_template_directory_uri() . '/assets/js/analysis.js', array('jquery'), false, true);
    wp_enqueue_script('finanai-charts', get_template_directory_uri() . '/assets/js/charts.js', array('jquery'), false, true);
    wp_enqueue_script('finanai-notifications', get_template_directory_uri() . '/assets/js/notifications.js', array('jquery'), false, true);
}
add_action('wp_enqueue_scripts', 'finanai_enqueue_scripts');
