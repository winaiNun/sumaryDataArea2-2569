<template>
  <div class="admin-page">
    <div class="panel topbar">
      <div>
        <h1>Admin Panel</h1>
        <p>จัดการข้อมูลโรงเรียนและแก้ไขสถานะแบบง่าย ๆ</p>
      </div>
      <div class="nav-actions">
        <NuxtLink to="/" class="btn secondary">← กลับหน้าหลัก</NuxtLink>
      </div>
    </div>

    <div class="panel admin-box">
      <div class="admin-actions">
        <button class="btn" @click="saveChanges">บันทึกการเปลี่ยนแปลง</button>
        <button class="btn secondary" @click="addRow">เพิ่มโรงเรียน</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>โรงเรียน</th>
              <th>อำเภอ</th>
              <th>ศูนย์เครือข่าย</th>
              <th>สถานะ</th>
              <th>ความคืบหน้า</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="school in editableSchools" :key="school.id">
              <td><input v-model="school.schoolName" /></td>
              <td><input v-model="school.district" /></td>
              <td><input v-model="school.network" /></td>
              <td><input v-model="school.evaluationStatus" /></td>
              <td><input v-model.number="school.progress" type="number" min="0" max="100" /></td>
              <td><input v-model="school.note" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
const { data: schools } = await useAsyncData('admin-schools', () =>
  $fetch('/api/schools').catch(() => [] as any[])
)
const editableSchools = ref<Array<any>>((schools.value || []).map((s: any) => ({ ...s })))

function addRow() {
  editableSchools.value.unshift({
    id: Date.now(),
    schoolName: 'โรงเรียนใหม่',
    district: 'ไม่ระบุ',
    network: 'ไม่ระบุ',
    evaluationStatus: 'อยู่ระหว่างดำเนินการ',
    progress: 50,
    evidence: 0,
    note: 'เพิ่มใหม่'
  })
}

function saveChanges() {
  alert(`บันทึกข้อมูลแล้วจำนวน ${editableSchools.value.length} แถว`)
}
</script>
