<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Destinataire d'un document : entreprise, et ligne complémentaire avec sa mention
 * (« À l'attention de », « p.a. », « c/o », « Case postale ») pour l'adresse imprimée.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('recipient_company')->nullable()->after('address_id');
            $table->string('recipient_extra_label', 30)->nullable()->after('recipient_first_name');
            $table->string('recipient_extra')->nullable()->after('recipient_extra_label');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['recipient_company', 'recipient_extra_label', 'recipient_extra']);
        });
    }
};
