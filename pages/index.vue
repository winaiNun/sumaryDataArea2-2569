<template>
  <!-- ── ERROR SCREEN ── -->
  <div v-if="!data" class="upload-screen">
    <div class="upload-card">
      <div class="upload-icon">⚠️</div>
      <h1 class="upload-title">ไม่สามารถโหลดข้อมูลได้</h1>
      <p class="upload-sub">สพป.นครราชสีมา เขต 2</p>
      <p class="upload-desc" style="color:#e55; font-weight:600;">
        ไม่สามารถเชื่อมต่อกับ Google Sheets ได้
      </p>
      <div style="margin-top:1.5rem; background:#f0f4f8; border-radius:12px; padding:1.2rem 1.5rem; text-align:left; font-size:0.92rem; color:#555; line-height:1.9;">
        <strong>วิธีแก้ไข:</strong><br/>
        1. ตรวจสอบว่าตั้งค่า <code>APPS_SCRIPT_URL</code> ใน .env แล้ว<br/>
        2. ตรวจสอบว่า Google Apps Script deploy เป็น Web App แล้ว<br/>
        3. ตั้งค่า Who has access: <strong>Anyone</strong>
      </div>
    </div>
  </div>

  <!-- ── DASHBOARD ── -->
  <div v-else class="page" id="dashboard">

    <!-- ── TOPBAR ── -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="topbar-icon">📊</div>
        <div>
          <h1>Dashboard สรุปผลการนิเทศ ติดตาม การเปิดภาคเรียนที่ 1 ปีการศึกษา 2569</h1>
          <p class="topbar-sub">สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 2</p>
        </div>
      </div>
      <div class="topbar-actions">
        <button class="btn-ghost" @click="requestSchoolManager">🏫 กำหนดโรงเรียน</button>
        <button class="btn-ghost btn-refresh" :disabled="refreshing" @click="refreshData">
          <span v-if="refreshing" class="spinner" style="width:14px;height:14px;border-width:2px;vertical-align:middle;margin-right:4px"></span>
          {{ refreshing ? 'กำลังรีเฟรช…' : '🔄 รีเฟรชข้อมูล' }}
        </button>
      </div>
    </header>

    <!-- ── FILTER BAR ── -->
    <div class="filter-bar">
      <button class="chip" :class="{ 'chip-active': isAll }" @click="resetFilter">ทั้งหมด</button>

      <select v-model="filter.district" class="filter-select" @change="filter.network = ''; filter.school = ''">
        <option value="">อำเภอทั้งหมด</option>
        <option v-for="d in data?.districts" :key="d" :value="d">{{ d }}</option>
      </select>

      <select v-model="filter.network" class="filter-select" @change="filter.school = ''">
        <option value="">ศูนย์เครือข่ายทั้งหมด</option>
        <option v-for="n in availableNetworks" :key="n" :value="n">{{ n }}</option>
      </select>

      <select v-model="filter.school" class="filter-select school-select">
        <option value="">ทุกโรงเรียน</option>
        <option v-for="s in availableSchools" :key="s.code" :value="s.code">{{ s.code }} — {{ s.name }}</option>
      </select>

      <button
        v-if="filter.school"
        class="btn-edit-school"
        @click="requestEdit(filter.school)"
      >✏️ แก้ไขข้อมูล</button>

      <div class="school-count-badge">
        <strong>{{ filteredSchools.length }}</strong>
        <span> / {{ data?.schools.length || 0 }} โรงเรียน</span>
      </div>
    </div>

    <!-- ── OVERVIEW STRIP ── -->
    <div class="overview-strip">
      <div v-for="(s, i) in summaries" :key="i" class="ov-card" :class="`ac${i}`">
        <div class="ov-top">
          <span class="ov-pct">{{ s.donePct }}<small>%</small></span>
          <span class="ov-complete-badge">{{ s.completedSchools }} รร. เสร็จ</span>
        </div>
        <div class="ov-name">{{ s.name }}</div>
        <div class="ov-bar-bg">
          <div class="ov-bar-fill" :style="{ width: s.donePct + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- ── CRITERIA GRID 2×2 ── -->
    <div class="criteria-grid">
      <div
        v-for="(s, i) in summaries"
        :key="i"
        :id="`card-${i}`"
        class="crit-card"
        :class="`ac${i}`"
      >
        <!-- Card header -->
        <div class="crit-head">
          <div class="crit-accent-bar"></div>
          <h2 class="crit-title">{{ s.name }}</h2>
          <div class="crit-btns">
            <button class="icon-btn" title="ดูหลักฐาน" @click="openEvidence(i, null)">📋 หลักฐาน</button>
            <button class="icon-btn print-trigger" title="พิมพ์อินโฟกราฟิก" @click="printCard(i)">🖨 พิมพ์</button>
          </div>
        </div>

        <!-- Body: donut + bars -->
        <div class="crit-body">

          <!-- Donut chart -->
          <div class="donut-section">
            <svg viewBox="0 0 36 36" class="donut">
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e9edf2" stroke-width="4"/>
              <circle
                cx="18" cy="18" r="15.9155" fill="none" stroke="var(--done)" stroke-width="4"
                :stroke-dasharray="`${s.donePct} 100`" stroke-dashoffset="0"
                transform="rotate(-90 18 18)" stroke-linecap="butt"
              />
              <circle
                v-if="s.midPct >= 1"
                cx="18" cy="18" r="15.9155" fill="none" stroke="var(--mid)" stroke-width="4"
                :stroke-dasharray="`${s.midPct} 100`" :stroke-dashoffset="`${-s.donePct}`"
                transform="rotate(-90 18 18)"
              />
              <text x="18" y="16.5" text-anchor="middle" class="donut-big">{{ s.donePct.toFixed(1) }}</text>
              <text x="18" y="22" text-anchor="middle" class="donut-small">%</text>
            </svg>

            <div class="donut-legend">
              <div class="dl-row">
                <span class="dl-dot done"></span>
                <span class="dl-label">เสร็จสมบูรณ์</span>
                <strong class="dl-val">{{ s.completedSchools }}<small> รร.</small></strong>
              </div>
              <div class="dl-row">
                <span class="dl-dot mid"></span>
                <span class="dl-label">กำลังดำเนินการ</span>
                <strong class="dl-val">{{ s.inProgressSchools }}<small> รร.</small></strong>
              </div>
              <div class="dl-row">
                <span class="dl-dot none"></span>
                <span class="dl-label">ยังไม่เริ่ม</span>
                <strong class="dl-val">{{ s.notStartedSchools }}<small> รร.</small></strong>
              </div>
            </div>
          </div>

          <!-- Group breakdown -->
          <div class="groups-section">
            <div class="groups-legend-mini">
              <span class="legend-clickable" role="button" @click="openSchoolList(i, 'done')"><i class="dot-mini done"></i>{{ legendLabel(i, 'done') }} <b>{{ s.donePct.toFixed(2) }}%</b></span>
              <span v-if="s.midPct > 0" class="legend-clickable" role="button" @click="openSchoolList(i, 'mid')"><i class="dot-mini mid"></i>{{ legendLabel(i, 'mid') }} <b>{{ s.midPct.toFixed(2) }}%</b></span>
              <span class="legend-clickable" role="button" @click="openSchoolList(i, 'none')"><i class="dot-mini none"></i>{{ legendLabel(i, 'none') }} <b>{{ s.nonePct.toFixed(2) }}%</b></span>
            </div>
            <div class="groups-list">
              <div
                v-for="(g, gi) in s.groups"
                :key="gi"
                class="grow"
                role="button"
                tabindex="0"
                @click="openEvidence(i, gi)"
                @keydown.enter="openEvidence(i, gi)"
              >
                <span class="grow-label">{{ g.label }}</span>
                <div class="stacked">
                  <div class="seg sdone" :style="{ width: g.donePct + '%' }" :title="`${legendLabel(i, 'done')} ${g.donePct}%`"></div>
                  <div class="seg smid"  :style="{ width: g.midPct  + '%' }" :title="`${legendLabel(i, 'mid')} ${g.midPct}%`"></div>
                  <div class="seg snone" :style="{ width: g.nonePct + '%' }" :title="`${legendLabel(i, 'none')} ${g.nonePct}%`"></div>
                </div>
                <div class="grow-right">
                  <span class="grow-pct">{{ g.donePct.toFixed(2) }}%</span>
                  <span v-if="g.mean !== null" class="grow-mean">เฉลี่ย {{ g.mean.toFixed(2) }} <em>{{ qualityLabel(g.mean, g.scale) }}</em></span>
                </div>
              </div>
            </div>
          </div>

        </div><!-- /crit-body -->

        <!-- Print header (visible only in print) -->
        <div class="print-header">
          <div class="print-header-title">Dashboard สรุปผลการนิเทศ ติดตาม การเปิดภาคเรียนที่ 1 ปีการศึกษา 2569</div>
          <div class="print-header-sub">สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 2</div>
          <div class="print-filter-row">
            <span class="print-filter-label">ขอบเขตข้อมูล:</span>
            <span v-if="isAll" class="print-filter-val">ทุกโรงเรียนในสังกัด</span>
            <template v-else>
              <span v-if="filter.district" class="print-filter-val">อำเภอ {{ filter.district }}</span>
              <span v-if="filter.network" class="print-filter-val">ศูนย์เครือข่าย {{ filter.network }}</span>
              <span v-if="filter.school" class="print-filter-val">โรงเรียน {{ availableSchools.find(sc => sc.code === filter.school)?.name || filter.school }}</span>
            </template>
            <span class="print-filter-count">{{ filteredSchools.length }} โรงเรียน</span>
          </div>
        </div>

        <!-- Print footer -->
        <div class="print-meta">
          <span>กลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา สพป.นครราชสีมา เขต 2</span>
          <span>พิมพ์วันที่ {{ now }}</span>
        </div>
      </div><!-- /crit-card -->
    </div>

    <!-- ── FOOTER ── -->
    <footer class="site-footer">
      <p class="footer-dept">กลุ่มนิเทศ ติดตามและประเมินผลการจัดการศึกษา</p>
      <p class="footer-org">สำนักงานเขตพื้นที่การศึกษาประถมศึกษานครราชสีมา เขต 2</p>
    </footer>

    <!-- ── EVIDENCE PANEL ── -->
    <Teleport to="body">
      <transition name="overlay-fade">
        <div v-if="ev.open" class="ev-overlay" @click.self="ev.open = false">
          <div class="ev-panel">
            <div class="ev-head">
              <div>
                <h3 class="ev-title">หลักฐาน · {{ ev.sheetName }}</h3>
                <p class="ev-sub" v-if="ev.groupLabel">{{ ev.groupLabel }}</p>
              </div>
              <div class="ev-head-actions">
                <button v-if="!ev.loading && ev.agg.length" class="btn-export" @click="exportExcel" title="ส่งออก Excel">📊 Excel</button>
                <button class="ev-close" @click="ev.open = false">✕</button>
              </div>
            </div>

            <div v-if="ev.loading" class="ev-loading">
              <span class="spinner"></span> กำลังโหลด…
            </div>

            <div v-else-if="!ev.rows.length" class="ev-empty">ไม่พบข้อมูลหลักฐาน</div>

            <div v-else class="ev-body">
              <!-- Aggregate summary per item -->
              <div v-if="ev.agg.length" class="ev-agg">
                <div class="ev-agg-title">สรุปรายข้อ ({{ ev.agg.length }} ข้อ · {{ ev.rows.length }} โรงเรียน)</div>
                <div v-for="a in ev.agg" :key="a.col" class="ev-agg-row">
                  <div class="ev-agg-label">{{ a.label }}</div>
                  <div class="ev-agg-stats">
                    <div class="ev-agg-bar-wrap">
                      <div class="stacked ev-agg-bar">
                        <div class="seg sdone" :style="{ width: a.donePct + '%' }"></div>
                        <div class="seg smid"  :style="{ width: a.midPct + '%' }"></div>
                        <div class="seg snone" :style="{ width: Math.max(0, 100 - a.donePct - a.midPct).toFixed(2) + '%' }"></div>
                      </div>
                    </div>
                    <span class="ev-agg-pct">{{ a.donePct.toFixed(2) }}%</span>
                    <span v-if="a.mean !== null" class="ev-agg-mean">{{ a.mean.toFixed(2) }} <em>{{ a.qualityLabel }}</em></span>
                  </div>
                </div>
              </div>

              <div class="ev-count">พบ {{ ev.rows.length }} โรงเรียน</div>
              <div v-for="row in ev.rows" :key="row.code" class="ev-school">
                <div class="ev-school-head">
                  <span class="ev-school-name">{{ row.name }}</span>
                  <span class="ev-chip district">{{ row.district }}</span>
                  <span class="ev-chip network">{{ row.network }}</span>
                </div>
                <div class="ev-items">
                  <div
                    v-for="item in row.items"
                    :key="item.label"
                    class="ev-item"
                    :class="`ev-${item.cat}`"
                  >
                    <span class="ev-status-badge" :class="`badge-${item.cat}`">{{ evidenceBadge(item) }}</span>
                    <span class="ev-item-label">{{ item.label }}</span>
                    <span v-if="item.evidence" class="ev-evidence">📎 {{ item.evidence }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ── EDIT MODAL ── -->
    <Teleport to="body">
      <transition name="overlay-fade">
        <div v-if="em.open" class="ev-overlay em-overlay" @click.self="closeEdit">
          <div class="em-modal">

            <!-- Header -->
            <div class="em-header">
              <div class="em-header-info">
                <h2 class="em-school-name">{{ em.data?.name || '…' }}</h2>
                <div class="em-meta-chips" v-if="em.data">
                  <span class="ev-chip district">{{ em.data.district }}</span>
                  <span class="ev-chip network">{{ em.data.network }}</span>
                </div>
              </div>
              <button class="ev-close" @click="closeEdit">✕</button>
            </div>

            <!-- Tabs -->
            <div class="em-tabs">
              <button
                v-for="(sheet, si) in (em.data?.sheets || [])"
                :key="si"
                class="em-tab"
                :class="[`ac${si}`, { 'em-tab-active': em.tab === si }]"
                @click="em.tab = si"
              >
                <span class="em-tab-num">{{ si + 1 }}</span>
                {{ sheet.name }}
              </button>
            </div>

            <!-- Body -->
            <div class="em-body">
              <div v-if="em.loading" class="ev-loading">
                <span class="spinner"></span> กำลังโหลดข้อมูล…
              </div>

              <template v-else-if="em.data">
                <div v-for="(sheet, si) in em.data.sheets" :key="si" v-show="em.tab === si">
                  <div v-if="!sheet.groups.length" class="ev-empty">ไม่พบข้อมูลในประเด็นนี้</div>

                  <div v-for="group in sheet.groups" :key="group.key" class="em-group">
                    <div class="em-group-title" :class="`em-gt-${si}`">{{ group.label }}</div>

                    <div class="em-items">
                      <div v-for="item in group.items" :key="item.statusCol" class="em-item">
                        <div class="em-item-label">{{ item.label }}</div>
                        <div class="em-item-fields">
                          <select
                            v-model="editForm[item.statusCol]"
                            class="em-select"
                            :class="emSelectClass(editForm[item.statusCol], si, item.statusCol)"
                          >
                            <option v-for="opt in (item.statusOptions || sheet.statusOptions)" :key="opt" :value="opt">{{ optionLabel(opt, item.statusCol) }}</option>
                          </select>
                          <input
                            v-model="editForm[item.evidenceCol]"
                            class="em-ev-input"
                            :placeholder="sheet.evidenceLabel + '…'"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="em-footer">
              <div v-if="em.error" class="em-error-msg">❌ {{ em.error }}</div>
              <div style="flex:1"></div>
              <button class="btn-ghost em-cancel" :disabled="em.saving" @click="closeEdit">ยกเลิก</button>
              <button class="btn-save-data" :disabled="em.saving" @click="saveEdit">💾 บันทึกข้อมูล</button>
            </div>

            <!-- Saving overlay -->
            <Transition name="overlay-fade">
              <div v-if="em.saving" class="em-saving-overlay">
                <span class="spinner em-spinner-lg"></span>
                <p>กรุณารอสักครู่…</p>
              </div>
            </Transition>

          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ── SAVE SUCCESS POPUP ── -->
    <Teleport to="body">
      <Transition name="overlay-fade">
        <div v-if="saveSuccess" class="success-popup-wrap">
          <div class="success-popup">
            <div class="success-popup-icon">✅</div>
            <div class="success-popup-text">บันทึกข้อมูลเรียบร้อยแล้ว</div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── SCHOOL MANAGER MODAL ── -->
    <Teleport to="body">
      <Transition name="overlay-fade">
        <div v-if="sm.open" class="ev-overlay" @click.self="sm.open = false">
          <div class="sm-modal">
            <div class="sm-header">
              <h2 class="sm-title">🏫 กำหนดโรงเรียนคุณภาพ และ Home School</h2>
              <button class="ev-close" @click="sm.open = false">✕</button>
            </div>

            <div class="sm-tabs">
              <button class="sm-tab" :class="{ 'sm-tab-active': sm.tab === 0 }" @click="sm.tab = 0">
                🏆 โรงเรียนคุณภาพ
                <span class="sm-count">{{ sm.schools.filter(s => s.qualitySchool).length }}</span>
              </button>
              <button class="sm-tab" :class="{ 'sm-tab-active': sm.tab === 1 }" @click="sm.tab = 1">
                🏠 Home School
                <span class="sm-count">{{ sm.schools.filter(s => s.homeSchool).length }}</span>
              </button>
            </div>

            <div class="sm-search">
              <input v-model="sm.search" class="sm-search-input" placeholder="🔍 ค้นหาโรงเรียน…" />
            </div>

            <div v-if="sm.loading" class="ev-loading"><span class="spinner"></span> กำลังโหลด…</div>

            <div v-else class="sm-list">
              <label
                v-for="s in smFiltered"
                :key="s.code"
                class="sm-item"
              >
                <input
                  type="checkbox"
                  class="sm-checkbox"
                  :checked="sm.tab === 0 ? s.qualitySchool : s.homeSchool"
                  @change="toggleFlag(s.code, sm.tab)"
                />
                <span class="sm-school-name">{{ s.name }}</span>
                <span class="sm-school-district">{{ s.district }}</span>
              </label>
              <div v-if="!smFiltered.length" class="ev-empty">ไม่พบโรงเรียน</div>
            </div>

            <div class="sm-footer">
              <div v-if="sm.error" class="em-error-msg">❌ {{ sm.error }}</div>
              <div style="flex:1"></div>
              <button class="btn-ghost" @click="sm.open = false" :disabled="sm.saving">ยกเลิก</button>
              <button class="btn-save-data" :disabled="sm.saving" @click="saveSchoolFlags">
                {{ sm.saving ? 'กำลังบันทึก…' : '💾 บันทึก' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── SCHOOL LIST MODAL ── -->
    <Teleport to="body">
      <Transition name="overlay-fade">
        <div v-if="sl.open" class="ev-overlay" @click.self="sl.open = false">
          <div class="sl-modal">
            <div class="sl-header">
              <div>
                <h3 class="sl-title">{{ sl.title }}</h3>
                <p class="sl-sub">{{ slSchools.length }} โรงเรียน</p>
              </div>
              <button class="ev-close" @click="sl.open = false">✕</button>
            </div>
            <div v-if="!slSchools.length" class="ev-empty" style="margin:2rem 1.5rem">ไม่พบโรงเรียนในกลุ่มนี้</div>
            <div v-else class="sl-body">
              <div v-for="sc in slSchools" :key="sc.code" class="sl-row">
                <div class="sl-info">
                  <span class="sl-name">{{ sc.name }}</span>
                  <span class="ev-chip district">{{ sc.district }}</span>
                  <span class="sl-pct" :class="`sl-pct-${schoolCat(sc, sl.sheetIdx)}`">{{ schoolDonePct(sc, sl.sheetIdx) }}%</span>
                </div>
                <button class="btn-edit-sm" @click="sl.open = false; requestEdit(sc.code)">✏️ แก้ไข</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── PIN MODAL ── -->
    <Teleport to="body">
      <Transition name="overlay-fade">
        <div v-if="pin.open" class="ev-overlay" @click.self="pin.open = false">
          <div class="pin-modal">
            <div class="pin-title">🔐 ป้อนรหัสผ่านเพื่อแก้ไขข้อมูล</div>
            <input
              v-model="pin.value"
              type="password"
              class="pin-input"
              placeholder="รหัสผ่าน"
              autocomplete="current-password"
              @keydown.enter="verifyPin"
            />
            <div v-if="pin.error" class="pin-error">{{ pin.error }}</div>
            <div class="pin-actions">
              <button class="btn-ghost" @click="pin.open = false">ยกเลิก</button>
              <button class="btn-save-data" @click="verifyPin">✓ ยืนยัน</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
type Stat = [number, number, number]
type Mean = [number, number]  // [sum, count]
type AggItem = { label: string; col: string; scale: number; total: number; done: number; mid: number; none: number; donePct: number; midPct: number; mean: number | null; qualityLabel: string }
type School = { code: string; name: string; district: string; network: string; os: string[]; g: Stat[][]; means: Mean[][] }
type DataRes = {
  sheetNames: string[]
  groupLabels: string[][]
  groupKeys: string[][]
  groupScales: number[][]
  districts: string[]
  networks: string[]
  schools: School[]
}
type DetailSheet = {
  name: string
  statusOptions: string[]
  evidenceLabel: string
  groups: Array<{
    key: string
    label: string
    items: Array<{
      statusCol: string; evidenceCol: string; label: string
      status: string; evidence: string; statusOptions?: string[]
    }>
  }>
}
type DetailRes = {
  code: string; name: string; district: string; network: string
  sheets: DetailSheet[]
}

const { data, refresh } = await useAsyncData('schools-data', () =>
  $fetch<DataRes>('/api/data').catch(() => null)
)

// ── Refresh ──
const refreshing = ref(false)
async function refreshData() {
  refreshing.value = true
  try { await $fetch('/api/refresh'); await refresh() }
  finally { refreshing.value = false }
}

// ── PIN protection ──
const PIN = 'admin2'
const pin = reactive({ open: false, value: '', error: '', targetCode: '', targetAction: 'edit' as 'edit' | 'schoolManager' })
function requestEdit(code: string) {
  pin.open = true; pin.value = ''; pin.error = ''
  pin.targetCode = code; pin.targetAction = 'edit'
}
function requestSchoolManager() {
  pin.open = true; pin.value = ''; pin.error = ''
  pin.targetCode = ''; pin.targetAction = 'schoolManager'
}
function verifyPin() {
  if (pin.value === PIN) {
    pin.open = false
    if (pin.targetAction === 'schoolManager') openSchoolManager()
    else openEdit(pin.targetCode)
  } else { pin.error = 'รหัสผ่านไม่ถูกต้อง'; pin.value = '' }
}

// ── School Manager ──
type QSchool = { code: string; name: string; district: string; qualitySchool: boolean; homeSchool: boolean }
const sm = reactive({ open: false, loading: false, saving: false, search: '', tab: 0, schools: [] as QSchool[], error: '' })

const smFiltered = computed(() =>
  sm.schools.filter(s => !sm.search || s.name.includes(sm.search) || s.district.includes(sm.search))
)

async function openSchoolManager() {
  sm.open = true; sm.loading = true; sm.search = ''; sm.tab = 0; sm.error = ''
  try {
    sm.schools = await $fetch<QSchool[]>('/api/quality-schools')
  } catch { sm.error = 'โหลดข้อมูลไม่สำเร็จ' }
  finally { sm.loading = false }
}

function toggleFlag(code: string, tab: number) {
  const s = sm.schools.find(x => x.code === code)
  if (!s) return
  if (tab === 0) s.qualitySchool = !s.qualitySchool
  else s.homeSchool = !s.homeSchool
}

async function saveSchoolFlags() {
  sm.saving = true; sm.error = ''
  try {
    await $fetch('/api/quality-schools', {
      method: 'POST',
      body: {
        flags: sm.schools.map(s => ({
          code: s.code,
          qualitySchool: s.qualitySchool ? 'ใช่' : '',
          homeSchool: s.homeSchool ? 'ใช่' : ''
        }))
      }
    })
    sm.open = false
    await refresh()
  } catch { sm.error = 'บันทึกไม่สำเร็จ' }
  finally { sm.saving = false }
}

// ── Filters ──
const filter = reactive({ district: '', network: '', school: '' })
const isAll = computed(() => !filter.district && !filter.network && !filter.school)
const resetFilter = () => { filter.district = ''; filter.network = ''; filter.school = '' }

const availableNetworks = computed(() => {
  const pool = filter.district
    ? data.value?.schools.filter(s => s.district === filter.district)
    : data.value?.schools
  return [...new Set((pool || []).map(s => s.network).filter(Boolean))].sort()
})

const availableSchools = computed(() => {
  return (data.value?.schools || [])
    .filter(s => {
      if (filter.district && s.district !== filter.district) return false
      if (filter.network && s.network !== filter.network) return false
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
})

const filteredSchools = computed(() => {
  return (data.value?.schools || []).filter(s => {
    if (filter.district && s.district !== filter.district) return false
    if (filter.network && s.network !== filter.network) return false
    if (filter.school && s.code !== filter.school) return false
    return true
  })
})

// ── Summaries ──
const summaries = computed(() => {
  if (!data.value) return []
  return data.value.sheetNames.map((name, si) => {
    const schools = filteredSchools.value
    let td = 0, tm = 0, tn = 0, completed = 0, inProgress = 0, notStarted = 0
    const numG = data.value!.groupLabels[si]?.length || 0
    const gAgg = Array.from({ length: numG }, () => ({ d: 0, m: 0, n: 0, sum: 0, cnt: 0 }))

    for (const sc of schools) {
      const os = sc.os[si] || ''
      if (os === 'เสร็จสมบูรณ์') completed++
      else if (os === '' || os === 'ยังไม่เริ่มประเมิน') notStarted++
      else inProgress++;
      (sc.g[si] || []).forEach(([d, m, n], gi) => {
        td += d; tm += m; tn += n
        if (gAgg[gi]) { gAgg[gi].d += d; gAgg[gi].m += m; gAgg[gi].n += n }
      });
      (sc.means?.[si] || []).forEach(([s, c], gi) => {
        if (gAgg[gi]) { gAgg[gi].sum += s; gAgg[gi].cnt += c }
      })
    }

    const tot = td + tm + tn
    const donePct = tot ? +(td / tot * 100).toFixed(2) : 0
    const midPct  = tot ? +(tm / tot * 100).toFixed(2) : 0

    const groups = gAgg.map((g, gi) => {
      const gt = g.d + g.m + g.n
      const dp = gt ? +(g.d / gt * 100).toFixed(2) : 0
      const mp = gt ? +(g.m / gt * 100).toFixed(2) : 0
      const scale = (data.value!.groupScales?.[si]?.[gi] ?? 0) as 0 | 4 | 5
      const mean = g.cnt > 0 ? +(g.sum / g.cnt).toFixed(2) : null
      return {
        label: data.value!.groupLabels[si][gi] || '',
        donePct: dp, midPct: mp, nonePct: +Math.max(0, 100 - dp - mp).toFixed(2),
        scale, mean
      }
    })

    return {
      name, completedSchools: completed, inProgressSchools: inProgress,
      notStartedSchools: notStarted, donePct, midPct,
      nonePct: +Math.max(0, 100 - donePct - midPct).toFixed(2), groups
    }
  })
})

// ── Evidence panel ──
const ev = reactive({
  open: false, loading: false, sheetName: '', groupLabel: '',
  rows: [] as any[], agg: [] as AggItem[], si: 0
})

async function openEvidence(si: number, gi: number | null) {
  ev.open = true; ev.loading = true; ev.si = si
  ev.sheetName = data.value?.sheetNames[si] || ''
  ev.groupLabel = gi !== null ? (data.value?.groupLabels[si]?.[gi] || '') : ''
  ev.rows = []; ev.agg = []
  const params: Record<string, string> = { sheet: String(si) }
  if (gi !== null) params.group = data.value?.groupKeys[si]?.[gi] || ''
  if (filter.district) params.district = filter.district
  if (filter.network) params.network = filter.network
  if (filter.school) params.schoolCode = filter.school
  const qs = new URLSearchParams(params).toString()
  try {
    const [rows, agg] = await Promise.all([
      $fetch<any[]>('/api/evidence?' + qs),
      $fetch<AggItem[]>('/api/evidence-agg?' + qs)
    ])
    ev.rows = rows; ev.agg = agg
  } finally { ev.loading = false }
}

async function exportExcel() {
  const XLSX = await import('xlsx')
  const now = new Date().toLocaleDateString('th-TH')
  const fname = `${ev.sheetName}${ev.groupLabel ? '_' + ev.groupLabel : ''}_${now}.xlsx`
  const wb = XLSX.utils.book_new()

  // Sheet 1: สรุปรายข้อ
  const isRating = ev.agg.some(a => a.scale > 0)
  const aggHeader = isRating
    ? ['รายข้อ', 'จำนวน', 'ค่าเฉลี่ย', 'ระดับคุณภาพ', '% ผ่านเกณฑ์']
    : ['รายข้อ', 'จำนวน', 'ดำเนินการแล้ว/มี', '% ดำเนินการแล้ว', 'อยู่ระหว่าง', '% อยู่ระหว่าง', 'ยังไม่', '% ยังไม่']
  const aggData = ev.agg.map(a => isRating
    ? [a.label, a.total, a.mean ?? '', a.qualityLabel, a.donePct]
    : [a.label, a.total, a.done, a.donePct, a.mid, a.midPct, a.none, +(100 - a.donePct - a.midPct).toFixed(2)]
  )
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([aggHeader, ...aggData]), 'สรุปรายข้อ')

  // Sheet 2: รายโรงเรียน
  if (ev.rows.length) {
    const itemLabels = ev.rows[0]?.items?.map((it: any) => it.label) ?? []
    const detailHeader = ['รหัส', 'ชื่อโรงเรียน', 'อำเภอ', 'ศูนย์เครือข่าย', ...itemLabels]
    const detailData = ev.rows.map((r: any) => [
      r.code, r.name, r.district, r.network,
      ...(r.items ?? []).map((it: any) => it.displayStatus || it.status)
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([detailHeader, ...detailData]), 'รายโรงเรียน')
  }

  XLSX.writeFile(wb, fname)
}

function statusLabel(cat: string) {
  return cat === 'done' ? 'เสร็จ' : cat === 'mid' ? 'ระหว่าง' : 'ยังไม่'
}

const LEGEND_LABELS: Record<number, { done: string; mid: string; none: string }> = {
  0: { done: 'ดำเนินการแล้ว', mid: 'อยู่ระหว่างดำเนินการ', none: 'ยังไม่ดำเนินการ' },
  1: { done: 'มี', mid: 'อยู่ระหว่าง', none: 'ไม่มี' },
  2: { done: 'ระดับดีมาก (4–5)', mid: 'ระดับดี (3)', none: 'ต้องปรับปรุง (1–2)' },
  3: { done: 'ดำเนินการแล้ว', mid: 'อยู่ระหว่างดำเนินการ', none: 'ยังไม่ดำเนินการ' }
}
function legendLabel(sheetIdx: number, cat: 'done' | 'mid' | 'none') {
  return (LEGEND_LABELS[sheetIdx] ?? LEGEND_LABELS[0])[cat]
}

function qualityLabel(mean: number, scale: number): string {
  if (scale === 5) {
    if (mean >= 4.5) return 'ดีเยี่ยม'
    if (mean >= 3.5) return 'ดีมาก'
    if (mean >= 2.5) return 'ดี'
    if (mean >= 1.5) return 'พอใช้'
    return 'ปรับปรุง'
  }
  if (scale === 4) {
    if (mean >= 3.5) return 'ดีเยี่ยม'
    if (mean >= 2.5) return 'ดี'
    if (mean >= 1.5) return 'พอใช้'
    return 'ปรับปรุง'
  }
  return ''
}

// ── School List Modal ──
const sl = reactive({ open: false, sheetIdx: 0, cat: 'done' as 'done' | 'mid' | 'none', title: '' })

function schoolStats(sc: School, si: number) {
  const groups = (sc.g[si] || []) as [number, number, number][]
  let td = 0, tm = 0, tn = 0
  for (const [d, m, n] of groups) { td += d; tm += m; tn += n }
  return { td, tm, tn, tot: td + tm + tn }
}

function schoolCat(sc: School, si: number): 'done' | 'mid' | 'none' {
  const { td, tm, tn, tot } = schoolStats(sc, si)
  if (tot === 0 || tn > 0) return 'none'
  if (tm > 0) return 'mid'
  return 'done'
}

function schoolDonePct(sc: School, si: number): number {
  const { td, tot } = schoolStats(sc, si)
  return tot ? Math.round(td / tot * 100) : 0
}

const slSchools = computed(() =>
  filteredSchools.value
    .filter(sc => {
      const { td, tm, tn, tot } = schoolStats(sc, sl.sheetIdx)
      if (sl.cat === 'done') return tot > 0 && tn === 0 && tm === 0
      if (sl.cat === 'mid') return tm > 0
      return tot === 0 || tn > 0
    })
    .sort((a, b) => {
      const as = schoolStats(a, sl.sheetIdx)
      const bs = schoolStats(b, sl.sheetIdx)
      if (sl.cat === 'none') return bs.tn - as.tn
      if (sl.cat === 'mid') return bs.tm - as.tm
      return a.name.localeCompare(b.name, 'th')
    })
)

function openSchoolList(sheetIdx: number, cat: 'done' | 'mid' | 'none') {
  const sheetName = (data.value?.sheetNames[sheetIdx] || '').replace(/^\d+\.\s*/, '')
  sl.sheetIdx = sheetIdx
  sl.cat = cat
  sl.title = `${legendLabel(sheetIdx, cat)} — ${sheetName}`
  sl.open = true
}

// ── Edit modal ──
const saveSuccess = ref(false)
const em = reactive({
  open: false, loading: false, saving: false,
  error: '', code: '', tab: 0,
  data: null as DetailRes | null
})
const editForm = reactive<Record<string, string>>({})

const SCALE4: Record<string, string> = { '4': 'ดีเยี่ยม', '3': 'ดี', '2': 'พอใช้', '1': 'ปรับปรุง' }
const SCALE5: Record<string, string> = { '5': 'ดีเยี่ยม', '4': 'ดีมาก', '3': 'ดี', '2': 'พอใช้', '1': 'ปรับปรุง' }

function optionLabel(opt: string, statusCol: string): string {
  if (statusCol.endsWith('(ระดับคะแนน 1-4)') && SCALE4[opt]) return `${opt} — ${SCALE4[opt]}`
  if (statusCol.endsWith('(ระดับคุณภาพ 1-5)') && SCALE5[opt]) return `${opt} — ${SCALE5[opt]}`
  return opt
}

function emSelectClass(val: string, si: number, statusCol = '') {
  const n = parseFloat(val) || 0
  if (statusCol.endsWith('(ระดับคะแนน 1-4)')) return n >= 3 ? 'em-sel-done' : n >= 2 ? 'em-sel-mid' : 'em-sel-none'
  if (si === 2) return n >= 4 ? 'em-sel-done' : n >= 3 ? 'em-sel-mid' : 'em-sel-none'
  if (val === 'ดำเนินการแล้ว' || val === 'มี') return 'em-sel-done'
  if (val === 'อยู่ระหว่างดำเนินการ') return 'em-sel-mid'
  return 'em-sel-none'
}

function evidenceBadge(item: { status: string; cat: string; displayStatus?: string }): string {
  if (item.displayStatus && item.displayStatus !== item.status) return item.displayStatus
  const n = parseFloat(item.status)
  if (!isNaN(n) && n > 0) {
    const map: Record<number, string> = { 5: 'ดีเยี่ยม', 4: 'ดีมาก', 3: 'ดี', 2: 'พอใช้', 1: 'ปรับปรุง' }
    return `${n} — ${map[n] || ''}`
  }
  return item.cat === 'done' ? 'มี/เสร็จ' : item.cat === 'mid' ? 'ระหว่าง' : 'ไม่มี/ยังไม่'
}

async function openEdit(code: string) {
  em.open = true; em.loading = true; em.saved = false; em.error = ''
  em.code = code; em.tab = 0; em.data = null
  // Clear form
  for (const k of Object.keys(editForm)) delete editForm[k]
  try {
    const detail = await $fetch<DetailRes>(`/api/school-detail?code=${code}`)
    em.data = detail
    for (const sheet of detail.sheets) {
      for (const group of sheet.groups) {
        for (const item of group.items) {
          editForm[item.statusCol] = item.status
          editForm[item.evidenceCol] = item.evidence
        }
      }
    }
  } catch (e: any) {
    em.error = 'โหลดข้อมูลไม่สำเร็จ'
  } finally {
    em.loading = false
  }
}

function closeEdit() { em.open = false }

async function saveEdit() {
  if (!em.data) return
  em.saving = true; em.saved = false; em.error = ''

  const updates: Array<{ sheetIdx: number; col: string; value: string }> = []
  em.data.sheets.forEach((sheet, si) => {
    for (const group of sheet.groups) {
      for (const item of group.items) {
        updates.push({ sheetIdx: si, col: item.statusCol, value: editForm[item.statusCol] ?? '' })
        updates.push({ sheetIdx: si, col: item.evidenceCol, value: editForm[item.evidenceCol] ?? '' })
      }
    }
  })

  try {
    await $fetch('/api/school-save', { method: 'POST', body: { code: em.code, updates } })
    closeEdit()
    await refresh()
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2500)
  } catch (e: any) {
    em.error = 'บันทึกไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    em.saving = false
  }
}

// ── Print ──
const now = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })

function printCard(idx: number) {
  document.body.dataset.printCard = String(idx)
  window.print()
  window.addEventListener('afterprint', () => { delete document.body.dataset.printCard }, { once: true })
}
</script>
