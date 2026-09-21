<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Carnet d'adresses centralisé : clients, fournisseurs, sous-traitants, contacts.
     */
    public function up(): void
    {
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->default('client')->index(); // client | fournisseur | sous_traitant | contact
            $table->string('title', 30)->nullable();               // Madame, Monsieur, Entreprise…
            $table->string('last_name');                            // nom ou raison sociale
            $table->string('first_name')->nullable();
            $table->string('designation')->nullable();
            $table->string('street')->nullable();
            $table->string('street_no', 20)->nullable();
            $table->string('po_box', 50)->nullable();
            $table->string('country', 5)->nullable();
            $table->string('zip', 10)->nullable();
            $table->string('city')->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('mobile', 40)->nullable();
            $table->string('email')->nullable();
            $table->string('debtor_no', 40)->nullable();
            $table->text('remark')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
