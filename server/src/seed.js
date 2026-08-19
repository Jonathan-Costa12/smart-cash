import bcrypt from 'bcryptjs';
import db from './db.js';
import * as lancamentosStore from './lancamentosStore.js';

const users = [
  { email: 'pessoa1@casal.com', nome: 'Pessoa 1', senha: 'mudar123' },
  { email: 'pessoa2@casal.com', nome: 'Pessoa 2', senha: 'mudar123' },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (email, password_hash, nome, is_master) VALUES (?, ?, ?, ?)'
);

users.forEach((u, i) => {
  const hash = bcrypt.hashSync(u.senha, 10);
  insertUser.run(u.email.toLowerCase(), hash, u.nome, i === 0 ? 1 : 0);
});

const hoje = new Date();
const mes = hoje.toISOString().slice(0, 7);
const data = (dia) => `${mes}-${String(dia).padStart(2, '0')}`;

const existentes = lancamentosStore.list({ mes });

if (existentes.length === 0) {
  const lancamentos = [
    { tipo: 'Receita', categoria: 'Fixa', fonte_descricao: 'Salário Pessoa 1', valor: 11500, vencimento: data(5), pagamento: data(5) },
    { tipo: 'Receita', categoria: 'Fixa', fonte_descricao: 'Salário Pessoa 2', valor: 11287, vencimento: data(5), pagamento: data(5) },
    { tipo: 'Despesa', categoria: 'Fixa', fonte_descricao: 'Aluguel', valor: 3200, vencimento: data(10), pagamento: data(10) },
    { tipo: 'Despesa', categoria: 'Fixa', fonte_descricao: 'Condomínio', valor: 850, vencimento: data(10), pagamento: data(10) },
    { tipo: 'Despesa', categoria: 'Fixa', fonte_descricao: 'Energia', valor: 420, vencimento: data(15), pagamento: null },
    { tipo: 'Despesa', categoria: 'Fixa', fonte_descricao: 'Internet', valor: 130, vencimento: data(12), pagamento: data(12) },
    { tipo: 'Despesa', categoria: 'Fixa', fonte_descricao: 'Cartão Nubank', valor: 4200, vencimento: data(18), pagamento: null },
    { tipo: 'Despesa', categoria: 'Variavel', fonte_descricao: 'Supermercado', valor: 1850, vencimento: data(8), pagamento: data(8) },
    { tipo: 'Despesa', categoria: 'Variavel', fonte_descricao: 'Restaurantes', valor: 620, vencimento: data(14), pagamento: data(14) },
    { tipo: 'Despesa', categoria: 'Variavel', fonte_descricao: 'Farmácia', valor: 280, vencimento: data(20), pagamento: null },
    { tipo: 'Despesa', categoria: 'Variavel', fonte_descricao: 'Transporte/Combustível', valor: 560, vencimento: data(22), pagamento: null },
    { tipo: 'Despesa', categoria: 'Variavel', fonte_descricao: 'Lazer', valor: 400, vencimento: data(25), pagamento: null },
  ];

  for (const l of lancamentos) {
    lancamentosStore.create({ ...l, origem: 'manual', usuario_email: users[0].email });
  }
  console.log(`Seed: ${lancamentos.length} lançamentos criados para ${mes}`);
} else {
  console.log('Seed: já existem lançamentos para o mês atual, nada foi inserido.');
}

console.log('Usuários disponíveis:');
for (const u of users) console.log(`  ${u.email} / ${u.senha}`);
