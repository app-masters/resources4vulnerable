import { CameraOutlined, QrcodeOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Form, Input, InputNumber, Modal, Typography } from 'antd';
import { useFormik } from 'formik';
import React, { useEffect, useRef, useState } from 'react';
import QrReader from 'react-qr-reader';
import { useSelector, useDispatch } from 'react-redux';
import Webcam from 'react-webcam';
import { FamilySearch } from '../../components/familyValidation';
import { Family } from '../../interfaces/family';
import { AppState } from '../../redux/rootReducer';
import yup from '../../utils/yup';
import { requestSaveConsumption } from '../../redux/consumption/actions';

const schema = yup.object().shape({
  nfce: yup.string().label('Nota fiscal eletrônica').required(),
  value: yup.number().label('Valor em reais').min(0).required(),
  proofImageUrl: yup.string().label('Link da imagem').required(),
  familyId: yup.string().label('Família').required('É preciso selecionar uma família ao digitar um NIS'),
  birthday: yup.string().label('Aniversário')
});

/**
 * Clear NFCe QRCode result
 * @param value url
 */
const handleQRCode = (value: string | null) => {
  if (!value) return null;
  return value;
  // // https://nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=31200417745613005462650030000484351494810435|2|1|1|d3bfca6136abee66286116203f747bc8e6fd3300
  // const nfce = value.split('nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=')[1];
  // if (!nfce) return null; // Not a valid nfce QRCode
  // return nfce.split('|')[0];
};

/**
 * Dashboard page component
 * @param props component props
 */
export const ConsumptionForm: React.FC<{ open: boolean; closeModal: Function }> = ({ open, closeModal }) => {
  const cameraRef = useRef(null);
  const dispatch = useDispatch();

  // Local state
  const [, setPermission] = useState('prompt');
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  // Redux state
  const family = useSelector<AppState, Family | null | undefined>((state) => state.familyReducer.item);
  const loading = false;

  useEffect(() => {
    navigator.permissions.query({ name: 'camera' }).then((value) => {
      setPermission(value.state);
    });
  }, []);

  const {
    handleSubmit,
    handleChange,
    values,
    getFieldMeta,
    submitForm,
    status,
    errors,
    touched,
    setFieldValue,
    getFieldProps
  } = useFormik({
    initialValues: {
      nfce: '',
      value: 0,
      proofImageUrl: '',
      nisCode: '',
      familyId: '',
      birthday: '',
      acceptCheck: false
    },
    validationSchema: schema,
    onSubmit: (values, { setStatus }) => {
      setStatus();
      const invalidConsumptionValue = !!(family && values.value > family.balance);
      if (family && !invalidConsumptionValue && values.acceptCheck) {
        dispatch(
          requestSaveConsumption(
            {
              nfce: values.nfce,
              value: Number(values.value),
              proofImageUrl: values.proofImageUrl,
              familyId: values.familyId
            },
            () => {
              Modal.success({ title: 'Consumo salvo com sucesso', onOk: () => closeModal() });
            },
            () => setStatus('Ocorreu um erro ao confirmar consumo.')
          )
        );
      }
    }
  });

  const valueMeta = getFieldMeta('value');
  const imageMeta = getFieldMeta('proofImageUrl');
  const nfceMeta = getFieldMeta('nfce');

  const acceptCheckMeta = getFieldMeta('acceptCheck');
  const acceptCheckField = getFieldProps('acceptCheck');

  const invalidConsumptionValue = !!(family && values.value > 0 && values.value > family.balance);
  return (
    <Modal
      title={'Informar compra'}
      visible={open}
      onCancel={() => closeModal()}
      onOk={submitForm}
      confirmLoading={loading}
      okText="Confirmar compra"
      okButtonProps={{
        disabled:
          !!(errors && Object.keys(errors).length > 0 && touched) ||
          !family ||
          invalidConsumptionValue ||
          !values.acceptCheck
      }}
      okType={errors && Object.keys(errors).length > 0 && touched ? 'danger' : 'primary'}
    >
      {status && <Alert message="Erro no formulário" description={status} type="error" />}
      <form onSubmit={handleSubmit}>
        <Form layout="vertical">
          <FamilySearch onFamilySelect={(id) => setFieldValue('familyId', id)} />
          {values.familyId && (
            <>
              <Form.Item
                label="Valor total da compra"
                validateStatus={(!!valueMeta.error && !!valueMeta.touched) || invalidConsumptionValue ? 'error' : ''}
                help={
                  !!valueMeta.error && !!valueMeta.touched
                    ? valueMeta.error
                    : invalidConsumptionValue
                    ? 'Valor maior que saldo disponível'
                    : undefined
                }
              >
                <InputNumber
                  style={{ width: '100%' }}
                  id="value"
                  name="value"
                  size="large"
                  onChange={(value) => setFieldValue('value', value)}
                  value={Number(values.value)}
                  decimalSeparator=","
                  step={0.01}
                  precision={2}
                  min={0}
                  // max={family?.balance}
                  formatter={(value) => `R$ ${value}`}
                  parser={(value) => (value ? value.replace(/(R)|(\$)/g, '').trim() : '')}
                />
              </Form.Item>
              <Form.Item
                label="NFCe"
                validateStatus={!!nfceMeta.error && !!nfceMeta.touched ? 'error' : ''}
                help={!!nfceMeta.error && !!nfceMeta.touched ? nfceMeta.error : undefined}
              >
                <Input
                  id="nfce"
                  name="nfce"
                  size="large"
                  onChange={handleChange}
                  value={values.nfce}
                  onPressEnter={submitForm}
                  disabled
                  addonAfter={<Button type="link" onClick={() => setShowQRCodeModal(true)} icon={<QrcodeOutlined />} />}
                />
                <Modal
                  okButtonProps={{ disabled: true }}
                  okText="Confirmar"
                  cancelText="Cancelar"
                  onCancel={() => setShowQRCodeModal(false)}
                  visible={showQRCodeModal}
                >
                  <>
                    {showQRCodeModal && ( // Necessary to disable the camera
                      <QrReader
                        delay={200}
                        resolution={800}
                        onError={console.error}
                        onScan={(item) => {
                          const nfce = handleQRCode(item);
                          if (nfce) {
                            setFieldValue('nfce', nfce);
                            setShowQRCodeModal(false);
                          } else console.log(new Date().getTime(), 'reading...');
                        }}
                      />
                    )}
                  </>
                </Modal>
              </Form.Item>

              <Form.Item
                validateStatus={!!imageMeta.error && !!imageMeta.touched ? 'error' : ''}
                help={!!imageMeta.error && !!imageMeta.touched ? imageMeta.error : undefined}
              >
                <Button
                  size="large"
                  style={{ width: '100%' }}
                  onClick={() => setShowCameraModal(true)}
                  icon={<CameraOutlined />}
                >
                  {values.proofImageUrl ? 'Alterar foto dos comprovantes' : 'Adicionar foto dos comprovantes'}
                </Button>
                <Modal
                  okText="Confirmar"
                  cancelText="Cancelar"
                  onCancel={() => setShowCameraModal(false)}
                  onOk={async () => {
                    if (cameraRef && cameraRef.current) {
                      // weird ts error
                      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
                      // @ts-ignore
                      const imageUri = cameraRef.current.getScreenshot();
                      setShowCameraModal(false);
                      setFieldValue('proofImageUrl', imageUri);
                    }
                  }}
                  visible={showCameraModal}
                >
                  {showCameraModal && <Webcam audio={false} width="100%" ref={cameraRef} />}
                  <Typography.Paragraph>
                    Na foto, tentar mostrar:
                    <ul>
                      <li>Nota fiscal</li>
                      <li>Documento</li>
                    </ul>
                    Tente manter a foto o mais nítida possível.
                  </Typography.Paragraph>
                </Modal>
              </Form.Item>
              {values.proofImageUrl.length > 0 && (
                <Form.Item>
                  <img alt="example" style={{ width: '100%', maxWidth: '600px' }} src={values.proofImageUrl} />
                </Form.Item>
              )}
              <Form.Item
                validateStatus={!!acceptCheckMeta.error && !!acceptCheckMeta.touched ? 'error' : ''}
                help={!!acceptCheckMeta.error && !!acceptCheckMeta.touched ? acceptCheckMeta.error : undefined}
              >
                <Checkbox checked={values.acceptCheck} {...acceptCheckField}>
                  Apenas itens contemplados pelo o programa estão incluídos na compra que está sendo inserida
                </Checkbox>
              </Form.Item>
            </>
          )}
        </Form>
      </form>
    </Modal>
  );
};