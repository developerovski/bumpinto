package com.bumpinto;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "com.bumpinto", importOptions = ImportOption.DoNotIncludeTests.class)
class HexagonalArchitectureTest {

    @ArchTest
    static final ArchRule domainIsPure = classes()
            .that().resideInAPackage("com.bumpinto.domain..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.domain..", "java..");

    @ArchTest
    static final ArchRule domainHasNoFrameworkDependency = noClasses()
            .that().resideInAPackage("com.bumpinto.domain..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("org.springframework..", "jakarta..", "kong.unirest..");

    // SQL injection duruşu: tüm veri erişimi Spring Data'nın parametrik sorgularından.
    // Ham SQL yazmaya izin veren her giriş kapısı production kodda yasak — string
    // birleştirmeli sorgu yazma imkânı derlemede kapatılır. Kural yalnız EntityManager ve
    // JdbcTemplate'i saysaydı JdbcClient/NamedParameterJdbcTemplate/DataSource açık kalırdı.
    // (Tırnak "temizleyici" bilinçli olarak yok.)
    @ArchTest
    static final ArchRule sqlOnlyThroughSpringData = noClasses()
            .that().resideInAPackage("com.bumpinto..")
            .should().dependOnClassesThat().haveNameMatching(
                    "jakarta\\.persistence\\.EntityManager"
                            + "|jakarta\\.persistence\\.EntityManagerFactory"
                            + "|org\\.springframework\\.jdbc\\.core\\.JdbcTemplate"
                            + "|org\\.springframework\\.jdbc\\.core\\.namedparam"
                            + "\\.NamedParameterJdbcTemplate"
                            + "|org\\.springframework\\.jdbc\\.core\\.simple\\.JdbcClient"
                            + "|javax\\.sql\\.DataSource"
                            + "|java\\.sql\\.Connection"
                            + "|java\\.sql\\.Statement"
                            + "|java\\.sql\\.PreparedStatement");

    // Katman koklerinde sinif durmaz: her sinif bir ilgi alani alt paketinde yasar.
    // Aksi halde infra/ ve application/ zamanla duz bir cop kutusuna doner (2026-09-01
    // yeniden paketlemesinin sebebi buydu). Yalniz BumpintoApplication kokte kalir.
    @ArchTest
    static final ArchRule noClassesSitInLayerRoots = noClasses()
            .that().resideOutsideOfPackage("com.bumpinto")
            .should().resideInAnyPackage(
                    "com.bumpinto.domain",
                    "com.bumpinto.application",
                    "com.bumpinto.infra",
                    "com.bumpinto.adapter",
                    "com.bumpinto.adapter.in",
                    "com.bumpinto.adapter.out");

    // Bir kaynak paketi yalniz domain'i, paylasilan HTTP altyapisini ve config'i gorur.
    @ArchTest
    static final ArchRule venueSourcesAreSelfContained = classes()
            .that().resideInAnyPackage("com.bumpinto.adapter.out.foursquare..",
                    "com.bumpinto.adapter.out.google..", "com.bumpinto.adapter.out.open..")
            .should().onlyDependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.domain..", "com.bumpinto.infra.config..",
                    "com.bumpinto.adapter.out.provider", "com.bumpinto.adapter.out.foursquare..",
                    "com.bumpinto.adapter.out.google..", "com.bumpinto.adapter.out.open..",
                    "java..", "kong.unirest..", "org.springframework..", "org.slf4j..", "jakarta..");

    // Orkestrator SOMUT kaynagi gormez, yalniz SPI'yi.
    @ArchTest
    static final ArchRule orchestratorKnowsOnlyTheSpi = noClasses()
            .that().haveSimpleName("ProviderOrchestrator")
            .should().dependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.adapter.out.foursquare..",
                    "com.bumpinto.adapter.out.google..", "com.bumpinto.adapter.out.open..");

    // Cizim ve goruntu kodlama TEK adapterde: domain "java.." icinde oldugu icin java.awt'yi
    // domainIsPure kuralindan gecirebilir, ama bir OgCard'in font/renk bilmesi tam da portun
    // engellemek icin var oldugu sey. Kural, ilerideki bir "kucuk" ihlali derlemede yakalar.
    @ArchTest
    static final ArchRule awtStaysInTheImageAdapter = noClasses()
            .that().resideOutsideOfPackage("com.bumpinto.adapter.out.image..")
            .should().dependOnClassesThat().resideInAnyPackage("java.awt..", "javax.imageio..");

    @ArchTest
    static final ArchRule applicationDoesNotSeeVenueSources = noClasses()
            .that().resideInAPackage("com.bumpinto.application..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("com.bumpinto.adapter.out.foursquare..",
                    "com.bumpinto.adapter.out.google..", "com.bumpinto.adapter.out.open..",
                    "com.bumpinto.adapter.out.provider..");
}
