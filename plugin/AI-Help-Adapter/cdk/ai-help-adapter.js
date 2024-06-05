import lambda from 'aws-cdk-lib/aws-lambda';
import apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from "aws-cdk-lib/aws-iam";
import {Stack, CfnOutput} from 'aws-cdk-lib'


export class AIHelpAdapter extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
      // 定义 Lambda 层和函数的代码

    const SECRET_KEY = new CfnParameter(this, 'SECRET_KEY', {
        type: 'String',
        default: 'SECRET_KEY',
        description: 'Enter a value for SECRET_KEY',
      });

    const layer = new lambda.LayerVersion(this, 'AIHelpAdapterLayer', {
        code: lambda.Code.fromAsset('../lambda/AIHelpAdapterLayer.zip'),
        description: 'AI Help Adatper Python helper utility',
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
        layerVersionName:'AIHelpAdapterLayer',
      });

    const lambdaFunction = new lambda.Function(scope, 'AIHelpAdapter', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('../lambda/lambda_handler.py'),
      handler: 'lambda_handler',
      layers: [layer],
      timeout: Duration.minutes(2),
      environment: {
        SECRET_KEY: SECRET_KEY,
        ASK_ASSISTANT_FUNC_ARN:lambda_main_brain.functionArn,
      },
      memorySize: 256,
    });

  lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [ 
        "lambda:InvokeFunction"
        ],
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      }))

    // 定义 API Gateway 和与 Lambda 函数的关联
    const api = new apigw.RestApi(scope, 'AI-Help-Adapter-API');

    const resource = api.root.addResource('adapter');
    resource.addMethod('POST', new apigw.LambdaIntegration(lambdaFunction, { proxy: true }), {
      methodResponses: [{ statusCode: '200' }],
    });
    this.endpoint = api.url;
    new CfnOutput(this, `AI Help Adapter endpoint url`,{value:`${api.url}`});
  }
}