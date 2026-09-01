package com.bumpinto.application.error;

public class NoVenuesFoundException extends RuntimeException {
    public NoVenuesFoundException() {
        super("no venues found around midpoint — try another category");
    }
}
