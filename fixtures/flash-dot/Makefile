# Build with Dockerized Haxe 4.3 (Flash SWF target).
HAXE_IMAGE ?= haxe:4.3
OUT ?= mit-flash-dot.swf

.PHONY: all clean
all: $(OUT)

$(OUT): Dot.hx
	docker run --rm -v "$(CURDIR)":/work -w /work $(HAXE_IMAGE) \
	  haxe -main Dot -swf $(OUT) -swf-version 11 -D swf-header=320:240:30:1A1A2E

clean:
	rm -f $(OUT)
