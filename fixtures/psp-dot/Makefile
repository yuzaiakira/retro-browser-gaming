TARGET = rbg_dot
OBJS = src/main.o

CFLAGS = -O2 -G0 -Wall
CXXFLAGS = $(CFLAGS) -fno-exceptions -fno-rtti
ASFLAGS = $(CFLAGS)

LIBS = -lpspgu

PSP_EBOOT_TITLE = RBG Dot
EXTRA_TARGETS = EBOOT.PBP
PSP_EBOOT = EBOOT.PBP

PSPSDK = $(shell psp-config --pspsdk-path)
include $(PSPSDK)/lib/build.mak

