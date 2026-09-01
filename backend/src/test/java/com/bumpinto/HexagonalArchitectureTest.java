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
}
