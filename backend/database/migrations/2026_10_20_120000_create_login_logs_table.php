<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des connexions (page d'administration) : connexions réussies ou refusées, tentatives bloquées,
 * déconnexions, réinitialisations de mot de passe. Pas de clé étrangère vers `users` : le journal doit
 * survivre à la suppression d'un compte et aux reprises de données (l'e-mail saisi est gardé à part).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('email')->nullable()->index();          // adresse saisie (même inconnue)
            $table->string('event', 20)->index();                   // login | failed | throttled | logout | password_reset
            $table->string('reason', 30)->nullable();               // échec : unknown_email | bad_password
            $table->string('ip_address', 45)->nullable()->index();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_logs');
    }
};
