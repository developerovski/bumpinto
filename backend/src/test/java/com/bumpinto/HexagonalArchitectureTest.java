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
}
