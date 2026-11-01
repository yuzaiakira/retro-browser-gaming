// license:BSD-3-Clause
// copyright-holders:Retro Browser Gaming contributors
/***************************************************************************

  rbgdot — first-party Retro Browser Gaming arcade engineering fixture.

  Minimal raster board with no third-party CPU microcode, no parent set,
  no BIOS, no samples. Game logic lives in the driver; the ZIP only carries
  an MIT identity ROM used for ROMset validation.

  Controls: Coin, Start, 4-way joystick, Button 1.
  Save: MACHINE_SUPPORTS_SAVE (dot position, credits, started flag).

***************************************************************************/

#include "emu.h"
#include "screen.h"
#include "speaker.h"

namespace {

constexpr int SCREEN_W = 160;
constexpr int SCREEN_H = 120;
constexpr int DOT_SIZE = 6;

class rbgdot_state : public driver_device
{
public:
	rbgdot_state(const machine_config &mconfig, device_type type, const char *tag)
		: driver_device(mconfig, type, tag)
		, m_screen(*this, "screen")
		, m_controls(*this, "CONTROLS")
		, m_identity(*this, "identity")
	{
	}

	void rbgdot(machine_config &config) ATTR_COLD;

protected:
	virtual void machine_start() override ATTR_COLD;
	virtual void machine_reset() override ATTR_COLD;

private:
	required_device<screen_device> m_screen;
	required_ioport m_controls;
	required_region_ptr<uint8_t> m_identity;

	uint8_t m_dot_x = 77;
	uint8_t m_dot_y = 57;
	uint8_t m_credits = 0;
	uint8_t m_started = 0;
	uint8_t m_coin_latched = 0;
	uint8_t m_start_latched = 0;

	uint32_t screen_update(screen_device &screen, bitmap_rgb32 &bitmap, const rectangle &cliprect);
	void apply_controls();
};

void rbgdot_state::machine_start()
{
	save_item(NAME(m_dot_x));
	save_item(NAME(m_dot_y));
	save_item(NAME(m_credits));
	save_item(NAME(m_started));
	save_item(NAME(m_coin_latched));
	save_item(NAME(m_start_latched));

	// Identity ROM must start with magic "RBGDOT01"
	if (m_identity.bytes() < 8
		|| m_identity[0] != 'R' || m_identity[1] != 'B'
		|| m_identity[2] != 'G' || m_identity[3] != 'D'
		|| m_identity[4] != 'O' || m_identity[5] != 'T'
		|| m_identity[6] != '0' || m_identity[7] != '1')
	{
		fatalerror("rbgdot: identity ROM magic mismatch (expected RBGDOT01)\n");
	}
}

void rbgdot_state::machine_reset()
{
	m_dot_x = 77;
	m_dot_y = 57;
	m_credits = 0;
	m_started = 0;
	m_coin_latched = 0;
	m_start_latched = 0;
}

void rbgdot_state::apply_controls()
{
	const uint8_t ports = m_controls->read();
	const uint8_t coin = BIT(ports, 4);
	const uint8_t start = BIT(ports, 5);

	if (coin && !m_coin_latched && m_credits < 9)
		m_credits++;
	m_coin_latched = coin;

	if (start && !m_start_latched && m_credits > 0)
	{
		m_credits--;
		m_started = 1;
		m_dot_x = 77;
		m_dot_y = 57;
	}
	m_start_latched = start;

	if (!m_started)
		return;

	if (BIT(ports, 0) && m_dot_x > 0)
		m_dot_x--;
	if (BIT(ports, 1) && m_dot_x < SCREEN_W - DOT_SIZE)
		m_dot_x++;
	if (BIT(ports, 2) && m_dot_y > 0)
		m_dot_y--;
	if (BIT(ports, 3) && m_dot_y < SCREEN_H - DOT_SIZE)
		m_dot_y++;
}

uint32_t rbgdot_state::screen_update(screen_device &screen, bitmap_rgb32 &bitmap, const rectangle &cliprect)
{
	apply_controls();

	const rgb_t bg = m_started ? rgb_t(12, 28, 64) : rgb_t(8, 8, 16);
	const rgb_t fg = m_started ? rgb_t(240, 240, 255) : rgb_t(80, 80, 100);
	const rgb_t hud = rgb_t(255, 200, 40);

	for (int y = cliprect.min_y; y <= cliprect.max_y; y++)
		for (int x = cliprect.min_x; x <= cliprect.max_x; x++)
			bitmap.pix(y, x) = bg;

	if (m_started)
	{
		for (int dy = 0; dy < DOT_SIZE; dy++)
		{
			const int py = m_dot_y + dy;
			if (py < cliprect.min_y || py > cliprect.max_y)
				continue;
			for (int dx = 0; dx < DOT_SIZE; dx++)
			{
				const int px = m_dot_x + dx;
				if (px < cliprect.min_x || px > cliprect.max_x)
					continue;
				bitmap.pix(py, px) = fg;
			}
		}
	}

	// Credit lamps (top-left pixels) — input-driven, distinct from idle bg.
	for (int i = 0; i < m_credits; i++)
	{
		const int px = 2 + i * 4;
		const int py = 2;
		if (cliprect.contains(px, py))
			bitmap.pix(py, px) = hud;
	}

	(void)screen;
	return 0;
}

static INPUT_PORTS_START(rbgdot)
	PORT_START("CONTROLS")
	PORT_BIT(0x01, IP_ACTIVE_HIGH, IPT_JOYSTICK_LEFT) PORT_8WAY
	PORT_BIT(0x02, IP_ACTIVE_HIGH, IPT_JOYSTICK_RIGHT) PORT_8WAY
	PORT_BIT(0x04, IP_ACTIVE_HIGH, IPT_JOYSTICK_UP) PORT_8WAY
	PORT_BIT(0x08, IP_ACTIVE_HIGH, IPT_JOYSTICK_DOWN) PORT_8WAY
	PORT_BIT(0x10, IP_ACTIVE_HIGH, IPT_COIN1)
	PORT_BIT(0x20, IP_ACTIVE_HIGH, IPT_START1)
	PORT_BIT(0x40, IP_ACTIVE_HIGH, IPT_BUTTON1)
	PORT_BIT(0x80, IP_ACTIVE_HIGH, IPT_UNUSED)
INPUT_PORTS_END

void rbgdot_state::rbgdot(machine_config &config)
{
	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	m_screen->set_raw(6'000'000, 200, 0, SCREEN_W, 140, 0, SCREEN_H);
	m_screen->set_screen_update(FUNC(rbgdot_state::screen_update));

	SPEAKER(config, "mono").front_center();
}

ROM_START(rbgdot)
	ROM_REGION(0x0100, "identity", 0)
	ROM_LOAD("rbgdot.id", 0x0000, 0x0100, CRC(8fb91fe4) SHA1(0429fc596c819621eb6e68ce6e2386009e5ed8b5))
ROM_END

} // anonymous namespace

//    YEAR  NAME    PARENT  MACHINE  INPUT   CLASS         INIT        ROT   COMPANY                 FULLNAME                         FLAGS
GAME( 2026, rbgdot, 0,      rbgdot,  rbgdot, rbgdot_state, empty_init, ROT0, "Retro Browser Gaming", "RBG Dot (engineering fixture)", MACHINE_SUPPORTS_SAVE | MACHINE_NO_SOUND )
