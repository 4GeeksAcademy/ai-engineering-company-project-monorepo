"""Limits shared by the profile fields wherever they are accepted: the Profile
itself and the optional initial profile in ``POST /users``. No imports on
purpose, so ``users`` and ``profiles`` can both use it without a cycle."""

NAME_MAX = 80
ADDRESS_MAX = 200
PHONE_PATTERN = r"^\+?[0-9 ()\-.]{6,20}$"
