package com.bumpinto.application;

public class NoVenuesFoundException extends RuntimeException {
    public NoVenuesFoundException() {
        super("no venues found around midpoint — try another category");
    }
}
