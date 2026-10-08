<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - price_elements.price_updated_at : date du dernier changement de prix (« Mutation de » dans
 *   BauBit), mise à jour automatiquement quand un prix change, reprise à l'import.
 * - collaborators.baubit_id : clé d'origine (USE-12) pour la reprise des employés BauBit.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('price_elements', function (Blueprint $table) {
            $table->timestamp('price_updated_at')->nullable()->after('discount_percent');
        });
        Schema::table('collaborators', function (Blueprint $table) {
            $table->string('baubit_id', 30)->nullable()->index()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('price_elements', function (Blueprint $table) {
            $table->dropColumn('price_updated_at');
        });
        Schema::table('collaborators', function (Blueprint $table) {
            $table->dropIndex(['baubit_id']);
            $table->dropColumn('baubit_id');
        });
    }
};
