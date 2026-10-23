<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Documents dérivés d'un devis : demande d'acompte (`advance_percent`) et travaux exécutés (chaque position
 * garde la quantité du devis dans `quoted_quantity`, la quantité saisie étant celle exécutée).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('source_document_id')->nullable()->after('project_id')->constrained('documents')->nullOnDelete();
            $table->decimal('advance_percent', 5, 2)->nullable()->after('discount_percent');
        });
        Schema::table('document_positions', function (Blueprint $table) {
            $table->decimal('quoted_quantity', 12, 3)->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('document_positions', fn (Blueprint $table) => $table->dropColumn('quoted_quantity'));
        Schema::table('documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_document_id');
            $table->dropColumn('advance_percent');
        });
    }
};
