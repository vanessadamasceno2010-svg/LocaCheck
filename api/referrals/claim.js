export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido.',
    });
  }

  return res.status(410).json({
    success: false,
    disabled: true,
    message: 'O programa de indicação foi desativado.',
  });
}
